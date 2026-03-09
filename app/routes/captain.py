"""
Captain routes for team management and fixture operations.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import Fixture, Notification, PostponementRequest, User
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

captain = Blueprint('captain', __name__)


@captain.route('/captain/team', methods=['GET'])
@login_required
def get_captain_team():
    """Get the current captain's team data including division info."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
    
    team = current_user.captain_of
    if not team:
        return jsonify({'error': 'No team assigned', 'team': None}), 200
    
    team_data = team.to_dict()
    
    # Add division info
    if team.division:
        team_data['division'] = team.division.to_dict()
        team_data['division_name'] = team.division.name
        
        # Add league info if available
        if team.division.league:
            team_data['league_name'] = team.division.league.name
    
    return jsonify({'team': team_data})


@captain.route('/captain/fixtures', methods=['GET'])
@login_required
def get_captain_fixtures():
    """Get all fixtures for the captain's team."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
    
    # Enrich fixture data
    upcoming_list = []
    for f in upcoming:
        f_dict = f.to_dict()
        f_dict['is_home'] = f.home_team_id == team.id
        upcoming_list.append(f_dict)
    
    past_list = []
    for f in past:
        f_dict = f.to_dict()
        f_dict['is_home'] = f.home_team_id == team.id
        # Calculate result
        if f.home_score is not None and f.away_score is not None:
            if f.home_team_id == team.id:
                if f.home_score > f.away_score:
                    f_dict['result'] = 'win'
                elif f.home_score < f.away_score:
                    f_dict['result'] = 'loss'
                else:
                    f_dict['result'] = 'draw'
            else:
                if f.away_score > f.home_score:
                    f_dict['result'] = 'win'
                elif f.away_score < f.home_score:
                    f_dict['result'] = 'loss'
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
def get_captain_standings():
    """Get division standings for the captain's team."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
    
    team = current_user.captain_of
    if not team or not team.division:
        return jsonify({'standings': [], 'division': None, 'team_position': None})
    
    division = team.division
    teams = list(division.teams)
    
    # Sort by points, goal difference, goals for
    sorted_teams = sorted(
        teams,
        key=lambda t: (t.points, t.goal_difference, t.goals_for),
        reverse=True
    )
    
    standings = []
    team_position = None
    for pos, t in enumerate(sorted_teams, 1):
        if t.id == team.id:
            team_position = pos
        standings.append({
            'position': pos,
            'id': t.id,
            'name': t.name,
            'played': t.played,
            'won': t.won,
            'drawn': t.drawn,
            'lost': t.lost,
            'goals_for': t.goals_for,
            'goals_against': t.goals_against,
            'goal_difference': t.goal_difference,
            'points': t.points,
            'is_my_team': t.id == team.id
        })
    
    return jsonify({
        'standings': standings,
        'division': division.to_dict(),
        'league_name': division.league.name if division.league else None,
        'team_position': team_position
    })


@captain.route('/captain/fixtures/<int:id>/forfeit', methods=['POST'])
@login_required
def captain_forfeit_fixture(id):
    """Forfeit a fixture (3-0 loss + -3 point penalty)."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
    
    # Update forfeiting team stats (loss + -3 penalty)
    forfeiting_team.played += 1
    forfeiting_team.lost += 1
    forfeiting_team.goals_against += 3
    forfeiting_team.points -= 3  # -3 penalty per KEYPLAN
    
    # Update winning team stats (3-0 win)
    winning_team.played += 1
    winning_team.won += 1
    winning_team.goals_for += 3
    winning_team.points += 3
    
    # Notify admin
    admins = User.query.filter_by(role='admin').all()
    for admin in admins:
        db.session.add(Notification(
            user_id=admin.id,
            title="Fixture Forfeited",
            message=f"{team.name} forfeited match vs {winning_team.name}. -3 points penalty applied.",
            type='urgent'
        ))
        
    # Notify referee
    if fixture.ref_id:
        db.session.add(Notification(
            user_id=fixture.ref_id,
            title="Match Forfeited",
            message=f"Match {fixture.home_team.name} vs {fixture.away_team.name} was forfeited by {team.name}. No attendance required.",
            type='info'
        ))
    
    # Notify opposing captain
    if winning_team.captain_id:
        db.session.add(Notification(
            user_id=winning_team.captain_id,
            title="Opponent Forfeited",
            message=f"Your match vs {team.name} was forfeited. You win 3-0.",
            type='success'
        ))
        
    db.session.commit()
    return jsonify({'message': 'Match forfeited. -3 point penalty applied.'})


@captain.route('/captain/fixtures/<int:id>/postpone', methods=['POST'])
@login_required
def request_postponement(id):
    """Request postponement for a fixture."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
    admins = User.query.filter_by(role='admin').all()
    opponent = fixture.away_team.name if fixture.home_team_id == team.id else fixture.home_team.name
    for admin in admins:
        db.session.add(Notification(
            user_id=admin.id,
            title="Postponement Request",
            message=f"{team.name} requested postponement for match vs {opponent}",
            type='info'
        ))
        
    db.session.commit()
    return jsonify({'message': 'Request submitted'})
