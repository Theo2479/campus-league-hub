"""
Admin routes — league and division management.
"""
from flask import jsonify, request
from flask_login import login_required
from app import db
from app.models import League, Division, Team, Fixture, RefereeAvailability
from app.utils.decorators import require_role
import logging
from datetime import datetime, timezone

from app.routes.admin import admin

logger = logging.getLogger(__name__)


@admin.route('/admin/leagues', methods=['GET'])
@login_required
@require_role('admin')
def get_leagues():
    """Get all leagues with divisions."""
    leagues = League.query.all()
    result = []
    for league in leagues:
        l_dict = league.to_dict()
        l_dict['divisions'] = []
        for d in league.divisions:
            d_dict = d.to_dict()
            d_dict['teams'] = [td.team_id for td in d.teams]
            l_dict['divisions'].append(d_dict)
        result.append(l_dict)

    return jsonify({'leagues': result})


@admin.route('/admin/leagues', methods=['POST'])
@login_required
@require_role('admin')
def create_league():
    """Create a new league."""
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    league = League(
        name=name,
        default_day=data.get('day', 'Wednesday')
    )
    db.session.add(league)
    db.session.commit()

    l_dict = league.to_dict()
    l_dict['divisions'] = []

    return jsonify({'message': 'League created', 'league': l_dict})


@admin.route('/admin/leagues/<int:league_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_league(league_id):
    """Delete a league and all associated items including game chats."""
    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404

    try:
        from app.models import ChatChannel, TeamDivision

        for division in league.divisions:
            fixtures = Fixture.query.filter_by(division_id=division.id).all()
            if fixtures:
                fixture_ids = [f.id for f in fixtures]

                ChatChannel.query.filter(
                        ChatChannel.fixture_id.in_(fixture_ids),
                        ChatChannel.type == 'game'
                    ).delete(synchronize_session=False)

                for f in fixtures:
                    if f.date and f.time_slot:
                        fixture_date = f.date.date() if hasattr(f.date, 'date') else f.date
                        RefereeAvailability.query.filter_by(
                            date=fixture_date,
                            time_slot=f.time_slot
                        ).delete(synchronize_session=False)

                Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

            TeamDivision.query.filter_by(division_id=division.id).delete(synchronize_session=False)

            db.session.delete(division)

        db.session.delete(league)
        db.session.commit()
        return jsonify({'message': 'League and associated items deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting league: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@admin.route('/admin/leagues/<int:league_id>/divisions', methods=['POST'])
@login_required
@require_role('admin')
def create_division(league_id):
    """Create a new division in a league."""
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404

    day = data.get('day', league.default_day or 'Wednesday')

    div = Division(name=name, league_id=league_id, day_of_week=day)
    db.session.add(div)
    db.session.commit()

    d_dict = div.to_dict()
    d_dict['teams'] = []

    return jsonify({'message': 'Division created', 'division': d_dict})


@admin.route('/admin/divisions/<int:division_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_division(division_id):
    """Delete a division."""
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404

    try:
        fixtures = Fixture.query.filter_by(division_id=division_id).all()
        if fixtures:
            for f in fixtures:
                if f.date and f.time_slot:
                    fixture_date = f.date.date() if hasattr(f.date, 'date') else f.date
                    RefereeAvailability.query.filter_by(
                        date=fixture_date,
                        time_slot=f.time_slot
                    ).delete(synchronize_session=False)

            fixture_ids = [f.id for f in fixtures]
            Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

        from app.models import TeamDivision
        TeamDivision.query.filter_by(division_id=division.id).delete(synchronize_session=False)

        db.session.delete(division)
        db.session.commit()
        return jsonify({'message': 'Division deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting division: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@admin.route('/admin/divisions/<int:division_id>/teams', methods=['POST'])
@login_required
@require_role('admin')
def update_division_teams(division_id):
    """Update teams in a division."""
    div = Division.query.get(division_id)
    if not div:
        return jsonify({'error': 'Division not found'}), 404

    data = request.get_json()
    team_ids = data.get('teamIdentifiers', [])

    from app.models import TeamDivision

    existing_tds = TeamDivision.query.filter_by(division_id=division_id).all()
    existing_team_ids = [td.team_id for td in existing_tds]

    for td in existing_tds:
        if td.team_id not in team_ids:
            db.session.delete(td)

    for t_id in team_ids:
        if t_id not in existing_team_ids:
            team = Team.query.get(t_id)
            if team:
                new_td = TeamDivision(team_id=t_id, division_id=division_id)
                db.session.add(new_td)

    db.session.commit()

    return jsonify({'message': 'Teams assigned'})


@admin.route('/admin/divisions/<int:division_id>/fixtures', methods=['GET'])
@login_required
@require_role('admin')
def get_division_fixtures(division_id):
    """Get all fixtures for a division."""
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404

    fixtures = Fixture.query.filter_by(division_id=division_id).order_by(Fixture.date.desc()).all()

    return jsonify({
        'fixtures': [f.to_dict() for f in fixtures],
        'division': division.to_dict()
    })


@admin.route('/admin/divisions/<int:division_id>/overview', methods=['GET'])
@login_required
@require_role('admin')
def get_division_overview(division_id):
    """Get comprehensive division overview with standings and fixtures."""
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404

    teams = list(division.teams)
    team_ids = [td.team_id for td in teams]

    from app.models import TeamDivision
    team_divisions = TeamDivision.query.filter_by(division_id=division_id).all()

    sorted_teams = sorted(
        team_divisions,
        key=lambda td: (td.points, td.goal_difference, td.goals_for),
        reverse=True
    )

    standings = []
    for pos, td in enumerate(sorted_teams, 1):
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
            'points': td.points
        })

    now = datetime.now(timezone.utc)

    upcoming = Fixture.query.filter(
        Fixture.division_id == division_id,
        Fixture.date >= now,
        Fixture.status.in_(['scheduled', 'postponed']),
        Fixture.tournament_id == None
    ).order_by(Fixture.date.asc()).all()

    past = Fixture.query.filter(
        Fixture.division_id == division_id,
        (Fixture.date < now) | (Fixture.status == 'completed'),
        Fixture.tournament_id == None
    ).order_by(Fixture.date.desc()).all()

    upcoming_fixtures = []
    for f in upcoming:
            f_dict = f.to_dict()
            f_dict['ref_id'] = f.ref_id
            f_dict['has_referee'] = f.ref_id is not None
            upcoming_fixtures.append(f_dict)

    past_fixtures = []
    for f in past:
        f_dict = f.to_dict()
        f_dict['ref_id'] = f.ref_id
        past_fixtures.append(f_dict)

    return jsonify({
        'division': division.to_dict(),
        'standings': standings,
        'upcoming_fixtures': upcoming_fixtures,
        'past_fixtures': past_fixtures
    })
