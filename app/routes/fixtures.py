"""
Fixture routes shared across user roles.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import Fixture, Team, Division, League
from datetime import datetime

fixtures = Blueprint('fixtures', __name__)


@fixtures.route('/fixtures', methods=['GET'])
@login_required
def get_fixtures():
    """Get fixtures based on user role."""
    # If captain, show their team's fixtures
    if current_user.role == 'captain':
        team = current_user.captain_of
        if not team:
            return jsonify({'fixtures': []})
        
        fixtures_list = Fixture.query.filter(
            (Fixture.home_team_id == team.id) | (Fixture.away_team_id == team.id)
        ).order_by(Fixture.date).all()
        
        return jsonify({'fixtures': [f.to_dict() for f in fixtures_list]})
    
    # If ref or admin, show all
    fixtures_list = Fixture.query.order_by(Fixture.date).all()
    result = [f.to_dict() for f in fixtures_list]
        
    return jsonify({'fixtures': result})


@fixtures.route('/fixtures/generate', methods=['POST'])
@login_required
def generate_fixtures():
    """Generate fixtures for a division using round-robin scheduling."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    division_id = data.get('divisionId')
    start_date_str = data.get('date')
    games_per_week = data.get('gamesPerWeek')
    
    if not division_id or not start_date_str:
        return jsonify({'error': 'Missing divisionId or date'}), 400
        
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    try:
        div_id = int(division_id) if isinstance(division_id, str) else division_id
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid division ID'}), 400
        
    division = Division.query.get(div_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404

    from app.utils.scheduler import RoundRobinScheduler
    
    gpw = None
    if games_per_week and int(games_per_week) > 0:
        gpw = int(games_per_week)
    
    scheduler = RoundRobinScheduler(division, start_date, games_per_week=gpw)
    new_fixtures = scheduler.generate_fixtures()
    
    for f in new_fixtures:
        db.session.add(f)
    
    db.session.commit()
    
    return jsonify({'message': f'Generated {len(new_fixtures)} fixtures', 'count': len(new_fixtures)})


@fixtures.route('/leagues/<int:league_id>/generate-fixtures', methods=['POST'])
@login_required
def generate_league_fixtures(league_id):
    """Generate fixtures for an entire league using global pitch allocation."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
        
    data = request.get_json()
    start_str = data.get('date')
    
    if not start_str:
        return jsonify({'error': 'Start date required'}), 400
        
    try:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
        
    # Delete existing future scheduled fixtures
    div_ids = [d.id for d in league.divisions]
    cleanup_count = 0
    if div_ids:
        fixtures_to_delete = Fixture.query.join(Team, Fixture.home_team_id == Team.id)\
            .filter(
                Team.division_id.in_(div_ids),
                Fixture.status == 'scheduled',
                Fixture.date >= start_date
            ).all()
            
        for f in fixtures_to_delete:
            db.session.delete(f)
        cleanup_count = len(fixtures_to_delete)
         
    from app.utils.scheduler import LeagueRoundRobinScheduler
    scheduler = LeagueRoundRobinScheduler(league, start_date)
    new_fixtures = scheduler.generate_fixtures()
    
    for f in new_fixtures:
        db.session.add(f)
        
    db.session.commit()
    
    return jsonify({
        'message': f'Generated week-by-week schedule: {len(new_fixtures)} fixtures across {league.divisions.count()} divisions.',
        'cleanup_count': cleanup_count,
        'fixtures': [f.to_dict() for f in new_fixtures]
    })


@fixtures.route('/fixtures/<int:fixture_id>/score', methods=['POST'])
@login_required
def submit_score(fixture_id):
    """Submit a score for a fixture."""
    fixture = Fixture.query.get(fixture_id)
    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404
        
    # Auth check
    is_admin = current_user.role == 'admin'
    is_assigned_ref = current_user.role == 'referee' and fixture.ref_id == current_user.id
    
    if not (is_admin or is_assigned_ref):
        return jsonify({'error': 'Unauthorized'}), 403
        
    # Check if already completed
    if fixture.status == 'completed' and not is_admin:
        return jsonify({'error': 'Match already finalized. Contact admin to edit.'}), 400
         
    was_completed = fixture.status == 'completed'
    
    data = request.get_json()
    try:
        home_score = int(data['home_score'])
        away_score = int(data['away_score'])
    except (ValueError, KeyError):
        return jsonify({'error': 'Invalid scores'}), 400
        
    fixture.home_score = home_score
    fixture.away_score = away_score
    fixture.status = 'completed'
    
    if not was_completed:
        # Update home team
        home_team = Team.query.get(fixture.home_team_id)
        home_team.played += 1
        home_team.goals_for += home_score
        home_team.goals_against += away_score
        
        # Update away team
        away_team = Team.query.get(fixture.away_team_id)
        away_team.played += 1
        away_team.goals_for += away_score
        away_team.goals_against += home_score
        
        if home_score > away_score:
            home_team.won += 1
            home_team.points += 3
            away_team.lost += 1
        elif away_score > home_score:
            away_team.won += 1
            away_team.points += 3
            home_team.lost += 1
        else:
            home_team.drawn += 1
            home_team.points += 1
            away_team.drawn += 1
            away_team.points += 1
            
    db.session.commit()
    
    return jsonify({
        'message': 'Score submitted successfully', 
        'fixture': fixture.to_dict()
    })
