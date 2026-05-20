"""
Captain routes for team management and fixture operations.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import Fixture, PostponementRequest, User, Team, TeamDivision
from app.utils.decorators import require_role
from app.utils.notifications import notify_user, notify_admins
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

captain = Blueprint('captain', __name__)


@captain.route('/captain/team', methods=['GET'])
@login_required
@require_role('captain')
def get_captain_team():
    """Get the current captain's team data including division info."""
    team = current_user.captain_of
    if not team:
        return jsonify({'error': 'No team assigned', 'team': None}), 200
    
    team_data = team.to_dict()
    
    # Add division and stats info from the M2M relationship
    if team.divisions:
        # For the dashboard, we use the first division they are assigned to
        primary_td = team.divisions[0]
        primary_division = primary_td.division
        
        team_data['division'] = primary_division.to_dict()
        team_data['division_name'] = primary_division.name
        
        if primary_division.league:
            team_data['league_name'] = primary_division.league.name
            
        team_data['stats'] = {
            'played': sum(td.played for td in team.divisions),
            'won': sum(td.won for td in team.divisions),
            'drawn': sum(td.drawn for td in team.divisions),
            'lost': sum(td.lost for td in team.divisions),
            'points': sum(td.points for td in team.divisions),
            'goals_for': sum(td.goals_for for td in team.divisions),
            'goals_against': sum(td.goals_against for td in team.divisions),
            'goal_difference': sum(td.goal_difference for td in team.divisions)
        }
        
        division_stats = []
        for td in team.divisions:
            higher_ranked = TeamDivision.query.filter(
                TeamDivision.division_id == td.division_id,
                db.or_(
                    TeamDivision.points > td.points,
                    db.and_(
                        TeamDivision.points == td.points, 
                        (TeamDivision.goals_for - TeamDivision.goals_against) > (td.goals_for - td.goals_against)
                    )
                )
            ).count()
            position = higher_ranked + 1
            
            division_stats.append({
                'division_id': td.division_id,
                'position': position,
                'played': td.played,
                'won': td.won,
                'drawn': td.drawn,
                'lost': td.lost,
                'points': td.points,
                'goals_for': td.goals_for,
                'goals_against': td.goals_against,
                'goal_difference': td.goal_difference
            })
        team_data['division_stats'] = division_stats
    else:
        # Fallback empty stats if not in a division
        team_data['stats'] = {
            'played': 0, 'won': 0, 'drawn': 0, 'lost': 0,
            'points': 0, 'goals_for': 0, 'goals_against': 0,
            'goal_difference': 0
        }
        
    return jsonify({'team': team_data})


@captain.route('/captain/fixtures', methods=['GET'])
@login_required
@require_role('captain')
def get_captain_fixtures():
    """Get all fixtures for the captain's team."""
    team = current_user.captain_of
    if not team:
        return jsonify({'upcoming': [], 'past': []})
    
    now = datetime.now(timezone.utc)
    
    # Upcoming fixtures
    upcoming = Fixture.query.filter(
        ((Fixture.home_team_id == team.id) | (Fixture.away_team_id == team.id)),
        Fixture.date >= now,
        Fixture.status.in_(['scheduled', 'postponed'])
    ).order_by(Fixture.date.asc()).all()
    
    # Past/completed fixtures
    past = Fixture.query.filter(
        ((Fixture.home_team_id == team.id) | (Fixture.away_team_id == team.id)),
        (Fixture.date < now) | (Fixture.status == 'completed')
    ).order_by(Fixture.date.desc()).all()
    
    from app.models import Division
    upcoming_list = []
    for f in upcoming:
        f_dict = f.to_dict()
        f_dict['is_home'] = f.home_team_id == team.id
        if f.division_id:
            div = Division.query.get(f.division_id)
            if div:
                f_dict['league_name'] = div.league.name if div.league else None
                f_dict['division_name'] = div.name
        upcoming_list.append(f_dict)
    
    past_list = []
    for f in past:
        f_dict = f.to_dict()
        f_dict['is_home'] = f.home_team_id == team.id
        if f.division_id:
            div = Division.query.get(f.division_id)
            if div:
                f_dict['league_name'] = div.league.name if div.league else None
                f_dict['division_name'] = div.name
        # Calculate result
        if f.home_score is not None and f.away_score is not None:
            my_score = f.home_score if f.home_team_id == team.id else f.away_score
            opp_score = f.away_score if f.home_team_id == team.id else f.home_score
            my_pens = getattr(f, 'home_pens', None) if f.home_team_id == team.id else getattr(f, 'away_pens', None)
            opp_pens = getattr(f, 'away_pens', None) if f.home_team_id == team.id else getattr(f, 'home_pens', None)
            
            if my_score > opp_score:
                f_dict['result'] = 'win'
            elif my_score < opp_score:
                f_dict['result'] = 'loss'
            else:
                if my_pens is not None and opp_pens is not None:
                    if my_pens > opp_pens:
                        f_dict['result'] = 'win'
                    elif my_pens < opp_pens:
                        f_dict['result'] = 'loss'
                    else:
                        f_dict['result'] = 'draw'
                else:
                    f_dict['result'] = 'draw'
        past_list.append(f_dict)
    
    return jsonify({
        'upcoming': upcoming_list,
        'past': past_list,
        'team_name': team.name
    })


@captain.route('/captain/standings', methods=['GET'])
@login_required
@require_role('captain')
def get_captain_standings():
    """Get division standings for the captain's team."""
    team = current_user.captain_of
    if not team:
        return jsonify({'standings': [], 'division': None, 'team_position': None})
    
    # Find which divisions this captain's team is in
    
    # Get all TeamDivision associations for this team
    td_assocs = TeamDivision.query.filter_by(team_id=team.id).all()
    if not td_assocs:
        return jsonify({'standings': [], 'leagueName': 'Not assigned', 'available_divisions': []})
        
    available_divisions = []
    for td in td_assocs:
        available_divisions.append({
            'id': td.division.id,
            'name': td.division.name,
            'league_name': td.division.league.name if td.division.league else None
        })

    division_id_str = request.args.get('division_id')
    if division_id_str and division_id_str.isdigit():
        target_div_id = int(division_id_str)
        target_td = next((td for td in td_assocs if td.division_id == target_div_id), None)
        division = target_td.division if target_td else td_assocs[0].division
    else:
        # By default, show standings for the first division
        division = td_assocs[0].division
    
    # Get all team division records for this division
    division_teams = TeamDivision.query.filter_by(division_id=division.id).all()
    
    sorted_teams = sorted(
        division_teams,
        key=lambda td: (td.points, td.goal_difference, td.goals_for),
        reverse=True
    )
    
    standings = []
    team_position = None
    for pos, td in enumerate(sorted_teams, 1):
        if td.team.id == team.id:
            team_position = pos
        standings.append({
            'position': pos,
            'id': td.team.id,
            'name': td.team.name,
            'played': td.played,
            'won': td.won,
            'drawn': td.drawn,
            'lost': td.lost,
            'goals_for': td.goals_for,
            'goals_against': td.goals_against,
            'goal_difference': td.goal_difference,
            'points': td.points,
            'is_my_team': td.team.id == team.id
        })
    
    return jsonify({
        'standings': standings,
        'division': division.to_dict(),
        'league_name': division.league.name if division.league else None,
        'team_position': team_position,
        'available_divisions': available_divisions
    })


@captain.route('/captain/fixtures/<int:id>/forfeit', methods=['POST'])
@login_required
@require_role('captain')
def captain_forfeit_fixture(id):
    """Forfeit a fixture (3-0 loss + -3 point penalty)."""
    fixture = Fixture.query.get_or_404(id)
    team = current_user.captain_of
    
    if not team or (fixture.home_team_id != team.id and fixture.away_team_id != team.id):
        return jsonify({'error': 'Not your game'}), 403
    
    # Check if already completed
    if fixture.status == 'completed':
        return jsonify({'error': 'Match already completed'}), 400
        
    # Record forfeit (3-0 loss)
    is_home = (fixture.home_team_id == team.id)
    fixture.status = 'completed'
    fixture.home_score = 0 if is_home else 3
    fixture.away_score = 3 if is_home else 0
    
    # Get both teams
    forfeiting_team = team
    winning_team = fixture.away_team if is_home else fixture.home_team
    
    # Update stats if it is a league game
    if not fixture.tournament_id:
        from app.models import TeamDivision
        forfeiting_td = TeamDivision.query.filter_by(team_id=forfeiting_team.id, division_id=fixture.division_id).first()
        winning_td = TeamDivision.query.filter_by(team_id=winning_team.id, division_id=fixture.division_id).first()
        
        if forfeiting_td and winning_td:
            # Update forfeiting team stats (loss + -3 penalty)
            forfeiting_td.played += 1
            forfeiting_td.lost += 1
            forfeiting_td.goals_against += 3
            forfeiting_td.points -= 3  # -3 penalty per KEYPLAN
            
            # Update winning team stats (3-0 win)
            winning_td.played += 1
            winning_td.won += 1
            winning_td.goals_for += 3
            winning_td.points += 3
    
    # Notify admin
    notify_admins(
        "Fixture Forfeited",
        f"{team.name} forfeited match vs {winning_team.name}. -3 points penalty applied.",
        'urgent'
    )

    # Notify referee
    if fixture.ref_id:
        notify_user(
            fixture.ref_id,
            "Match Forfeited",
            f"Match {fixture.home_team.name} vs {fixture.away_team.name} was forfeited by {team.name}. No attendance required.",
            'info'
        )

    # Notify opposing captain
    if winning_team.captain_id:
        notify_user(
            winning_team.captain_id,
            "Opponent Forfeited",
            f"Your match vs {team.name} was forfeited. You win 3-0.",
            'success'
        )
        
    db.session.commit()
    return jsonify({'message': 'Match forfeited. -3 point penalty applied.'})


@captain.route('/captain/fixtures/<int:id>/postpone', methods=['POST'])
@login_required
@require_role('captain')
def request_postponement(id):
    """Request postponement for a fixture."""
    fixture = Fixture.query.get_or_404(id)
    team = current_user.captain_of
    
    if not team or (fixture.home_team_id != team.id and fixture.away_team_id != team.id):
        return jsonify({'error': 'Not your game'}), 403
        
    # Check if pending request exists
    existing = PostponementRequest.query.filter_by(fixture_id=id, status='pending').first()
    if existing:
        return jsonify({'error': 'Request already pending'}), 400
        
    req = PostponementRequest(
        fixture_id=id, 
        requester_team_id=team.id,
        reason="Captain requested via dashboard"
    )
    db.session.add(req)
    
    # Notify admin
    opponent = fixture.away_team.name if fixture.home_team_id == team.id else fixture.home_team.name
    notify_admins(
        "Postponement Request",
        f"{team.name} requested postponement for match vs {opponent}",
        'info'
    )
        
    db.session.commit()
    return jsonify({'message': 'Request submitted'})
