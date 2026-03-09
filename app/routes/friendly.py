"""
Friendly Market routes for captains to post and browse friendly match availability.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import FriendlyPost, User, ChatChannel, ChatParticipant, ChatMessage
from datetime import datetime

friendly = Blueprint('friendly', __name__)


@friendly.route('/captain/friendlies', methods=['GET'])
@login_required
def get_friendly_posts():
    """Get all open friendly posts."""
    if current_user.role not in ('captain', 'admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    
    posts = FriendlyPost.query.filter_by(status='open')\
        .order_by(FriendlyPost.created_at.desc()).all()
    
    return jsonify({'posts': [p.to_dict() for p in posts]})


@friendly.route('/captain/friendlies', methods=['POST'])
@login_required
def create_friendly_post():
    """Create a new friendly availability post."""
    if current_user.role != 'captain' and current_user.role != 'admin':
        return jsonify({'error': 'Only captains and admins can post'}), 403
    
    team = current_user.captain_of
    if not team:
        return jsonify({'error': 'You are not assigned to a team'}), 400
    
    data = request.get_json()
    date_str = data.get('date')
    time_str = data.get('time',)
    venue = data.get('venue', 'Flexible')
    notes = data.get('notes', '')
    
    if not date_str or not time_str:
        return jsonify({'error': 'Date and time are required'}), 400
    
    try:
        preferred_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    post = FriendlyPost(
        team_id=team.id,
        captain_id=current_user.id,
        preferred_date=preferred_date,
        preferred_time=time_str,
        venue_preference=venue,
        notes=notes
    )
    db.session.add(post)
    db.session.commit()
    
    return jsonify({
        'message': 'Friendly post created',
        'post': post.to_dict()
    })


@friendly.route('/captain/friendlies/<int:post_id>', methods=['DELETE'])
@login_required
def delete_friendly_post(post_id):
    """Delete own friendly post."""
    post = FriendlyPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    if post.captain_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(post)
    db.session.commit()
    
    return jsonify({'message': 'Post deleted'})


@friendly.route('/captain/friendlies/<int:post_id>/contact', methods=['POST'])
@login_required
def contact_friendly_team(post_id):
    """Contact a team about a friendly — creates a group chat with both captains + admin."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Only captains can contact'}), 403
    
    post = FriendlyPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    if post.captain_id == current_user.id:
        return jsonify({'error': 'You cannot contact your own post'}), 400
    
    my_team = current_user.captain_of
    if not my_team:
        return jsonify({'error': 'You are not assigned to a team'}), 400
    
    # Check if a friendly chat already exists between these two captains
    my_participations = ChatParticipant.query.filter_by(user_id=current_user.id).all()
    for p in my_participations:
        channel = p.channel
        if channel.type == 'group' and f"Friendly:" in (channel.name or ''):
            other = ChatParticipant.query.filter(
                ChatParticipant.channel_id == channel.id,
                ChatParticipant.user_id == post.captain_id
            ).first()
            if other:
                return jsonify({
                    'message': 'Chat already exists',
                    'chat_id': channel.id
                })
    
    # Create group chat: both captains + admin
    admin_user = User.query.filter_by(role='admin').first()
    
    channel = ChatChannel(
        name=f"Friendly: {my_team.name} & {post.team.name}",
        type='group'
    )
    db.session.add(channel)
    db.session.flush()
    
    # Add participants
    db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel.id))
    db.session.add(ChatParticipant(user_id=post.captain_id, channel_id=channel.id))
    if admin_user:
        db.session.add(ChatParticipant(user_id=admin_user.id, channel_id=channel.id))
    
    # Opening message
    db.session.add(ChatMessage(
        channel_id=channel.id,
        sender_id=current_user.id,
        content=f"Hi! {my_team.name} is interested in a friendly match on {post.preferred_date.strftime('%A %d %B')} at {post.preferred_time}. Let's arrange the details!"
    ))
    
    # Mark the post as matched
    post.status = 'matched'
    
    db.session.commit()
    
    return jsonify({
        'message': 'Chat created with the team',
        'chat_id': channel.id
    })
