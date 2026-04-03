"""
Admin routes — team management.
"""
from flask import jsonify, request
from flask_login import login_required
from app import db
from app.models import Team, Player, Fixture
from app.utils.decorators import require_role
import logging

from app.routes.admin import admin

logger = logging.getLogger(__name__)


@admin.route('/admin/teams', methods=['GET'])
@login_required
@require_role('admin')
def get_all_teams():
    """Get all teams."""
    teams = Team.query.all()
    return jsonify({'teams': [t.to_dict() for t in teams]})


@admin.route('/admin/teams', methods=['POST'])
@login_required
@require_role('admin')
def create_team():
    """Create a new team."""
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Team name is required'}), 400

    team = Team(name=name)
    db.session.add(team)
    db.session.commit()

    return jsonify({'message': 'Team created', 'team': team.to_dict()})


@admin.route('/admin/teams/<int:team_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_team(team_id):
    """Delete a team."""
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    try:
        from app.models import PostponementRequest, FriendlyPost

        FriendlyPost.query.filter_by(team_id=team_id).delete(synchronize_session=False)

        Player.query.filter_by(team_id=team_id).delete(synchronize_session='fetch')

        fixtures_to_delete = Fixture.query.filter(
            (Fixture.home_team_id == team_id) | (Fixture.away_team_id == team_id)
        ).all()

        if fixtures_to_delete:
            fixture_ids = [f.id for f in fixtures_to_delete]
            PostponementRequest.query.filter(
                PostponementRequest.fixture_id.in_(fixture_ids)
            ).delete(synchronize_session=False)
            Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

        PostponementRequest.query.filter_by(requester_team_id=team_id).delete(synchronize_session='fetch')

        db.session.delete(team)
        db.session.commit()

        return jsonify({'message': 'Team deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting team: {e}")
        return jsonify({'error': 'Internal server error'}), 500
