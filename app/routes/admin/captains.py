"""
Admin routes — captain management.
"""
from flask import jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import User, Team, Notification
from app.utils.decorators import require_role
import logging

from app.routes.admin import admin

logger = logging.getLogger(__name__)


@admin.route('/admin/captains', methods=['GET'])
@login_required
@require_role('admin')
def get_all_captains():
    """Get all captain accounts with team info."""
    captains = User.query.filter_by(role='captain').all()

    captain_list = []
    for c in captains:
        team = c.captain_of
        captain_list.append({
            'id': c.id,
            'username': c.username,
            'name': c.name,
            'phone': c.phone,
            'team_id': team.id if team else None,
            'team_name': team.name if team else None
        })

    return jsonify({
        'captains': captain_list,
        'count': len(captains)
    })


@admin.route('/admin/captains', methods=['POST'])
@login_required
@require_role('admin')
def create_captain():
    """Create a new captain account with auto-chat to admin."""
    data = request.get_json()

    username = data.get('username')
    name = data.get('name')
    phone = data.get('phone', '')
    password = data.get('password')
    team_id = data.get('team_id')

    if not username:
        return jsonify({'error': 'Username is required'}), 400

    if not password or len(password) < 8:
        return jsonify({'error': 'Password is required and must be at least 8 characters'}), 400

    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({'error': 'Username already exists'}), 400

    team = None
    if team_id:
        team = Team.query.get(team_id)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
        if team.captain_id:
            existing_captain = User.query.get(team.captain_id)
            if existing_captain:
                return jsonify({'error': f'Team already has captain: {existing_captain.username}'}), 400

    captain = User(
        username=username,
        name=name or username,
        phone=phone,
        role='captain'
    )
    captain.set_password(password)

    db.session.add(captain)
    db.session.flush()

    if team:
        team.captain_id = captain.id

    from app.models import ChatChannel, ChatParticipant, ChatMessage
    channel = ChatChannel(
        name=f"Admin & {captain.name}",
        type='direct'
    )
    db.session.add(channel)
    db.session.flush()

    db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel.id))
    db.session.add(ChatParticipant(user_id=captain.id, channel_id=channel.id))
    db.session.add(ChatMessage(
        channel_id=channel.id,
        sender_id=current_user.id,
        content=f"Welcome {captain.name}! This is your direct line to the admin."
    ))

    db.session.commit()

    return jsonify({
        'message': 'Captain account created successfully',
        'captain': {
            'id': captain.id,
            'username': captain.username,
            'name': captain.name,
            'phone': captain.phone,
            'team_id': team.id if team else None,
            'team_name': team.name if team else None
        }
    })


@admin.route('/admin/captains/<int:captain_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_captain(captain_id):
    """Delete a captain account and clean up orphan chats."""
    captain = User.query.get(captain_id)

    if not captain:
        return jsonify({'error': 'Captain not found'}), 404

    if captain.role != 'captain':
        return jsonify({'error': 'User is not a captain'}), 400

    if captain.captain_of:
        captain.captain_of.captain_id = None

    from app.models import FriendlyPost
    FriendlyPost.query.filter_by(captain_id=captain_id).delete(synchronize_session=False)

    Notification.query.filter_by(user_id=captain_id).delete()

    from app.models import ChatMessage, ChatParticipant, ChatChannel
    user_channels = [p.channel_id for p in ChatParticipant.query.filter_by(user_id=captain_id).all()]

    ChatMessage.query.filter_by(sender_id=captain_id).delete()
    ChatParticipant.query.filter_by(user_id=captain_id).delete()

    for channel_id in user_channels:
        channel = ChatChannel.query.get(channel_id)
        if channel and channel.type == 'direct':
            remaining = ChatParticipant.query.filter_by(channel_id=channel_id).count()
            if remaining <= 1:
                db.session.delete(channel)

    db.session.delete(captain)
    db.session.commit()

    return jsonify({'message': 'Captain deleted successfully'})


@admin.route('/admin/captains/<int:captain_id>/assign-team', methods=['POST'])
@login_required
@require_role('admin')
def assign_captain_team(captain_id):
    """Assign or change the team for a captain."""
    captain = User.query.get(captain_id)

    if not captain or captain.role != 'captain':
        return jsonify({'error': 'Captain not found'}), 404

    data = request.get_json()
    team_id = data.get('team_id')

    if captain.captain_of:
        captain.captain_of.captain_id = None

    if team_id:
        team = Team.query.get(team_id)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
        if team.captain_id and team.captain_id != captain_id:
            return jsonify({'error': 'Team already has a different captain'}), 400
        team.captain_id = captain_id

    db.session.commit()

    new_team = captain.captain_of
    return jsonify({
        'message': 'Team assignment updated',
        'captain': {
            'id': captain.id,
            'username': captain.username,
            'team_id': new_team.id if new_team else None,
            'team_name': new_team.name if new_team else None
        }
    })
