"""
Admin routes — data reset.
"""
import os
from flask import jsonify
from flask_login import login_required, current_user
from app import db
from app.models import User
from app.utils.decorators import require_role

from app.routes.admin import admin


@admin.route('/admin/reset-data', methods=['POST'])
@login_required
@require_role('admin')
def reset_all_data():
    """Wipe all data except the current admin account."""
    if os.environ.get('FLASK_ENV') == 'production':
        return jsonify({'error': 'Data reset is disabled in production'}), 403

    from app.models import (
        ChatMessage, ChatParticipant, ChatChannel,
        PostponementRequest, Notification, FriendlyPost,
        RefereeAvailability, PitchAvailability, Pitch,
        Player, Fixture, Team, Division, League, SystemSetting,
        Tournament, tournament_teams
    )

    try:
        ChatMessage.query.delete()
        ChatParticipant.query.delete()
        ChatChannel.query.delete()
        PostponementRequest.query.delete()
        Notification.query.delete()
        FriendlyPost.query.delete()
        RefereeAvailability.query.delete()
        PitchAvailability.query.delete()
        Pitch.query.delete()
        Player.query.delete()
        db.session.execute(tournament_teams.delete())
        Fixture.query.delete()
        Tournament.query.delete()
        Team.query.delete()
        Division.query.delete()
        League.query.delete()
        SystemSetting.query.delete()

        User.query.filter(User.id != current_user.id).delete()

        db.session.commit()
        return jsonify({'message': 'All data has been reset. Only your admin account remains.'})
    except Exception as e:
        db.session.rollback()
        import logging
        logging.getLogger(__name__).error(f"Reset failed: {e}")
        return jsonify({'error': 'Reset failed due to an internal error'}), 500
