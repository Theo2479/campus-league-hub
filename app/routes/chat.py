"""
Chat routes for messaging between users.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import ChatChannel, ChatParticipant, ChatMessage, User, Fixture
import logging

logger = logging.getLogger(__name__)

chat = Blueprint('chat', __name__)


def ensure_game_chat(fixture_id):
    """
    Ensure a chat channel exists for a fixture and correct participants are added.
    Called when a referee is assigned to a game.
    
    Args:
        fixture_id: The ID of the fixture (not the fixture object, to ensure fresh data)
    """
    # Always get fresh fixture data from DB
    fixture = Fixture.query.get(fixture_id)
    if not fixture:
        logger.warning(f"Fixture {fixture_id} not found for chat creation")
        return None
    
    # Debug log
    logger.info(f"Ensuring chat for fixture {fixture_id}: {fixture.home_team.name} vs {fixture.away_team.name}")
    logger.debug(f"Home team captain: {fixture.home_team.captain_id}, Away team captain: {fixture.away_team.captain_id}")
    logger.debug(f"Referee: {fixture.ref_id}")
    
    # Check if chat exists
    channel = ChatChannel.query.filter_by(fixture_id=fixture.id, type='game').first()
    
    if not channel:
        channel = ChatChannel(
            name=f"{fixture.home_team.name} vs {fixture.away_team.name}",
            type='game',
            fixture_id=fixture.id
        )
        db.session.add(channel)
        db.session.flush()  # Get ID
        logger.info(f"Created new channel {channel.id} for fixture {fixture_id}")
    else:
        # Update channel name in case teams changed
        expected_name = f"{fixture.home_team.name} vs {fixture.away_team.name}"
        if channel.name != expected_name:
            logger.info(f"Updating channel name from '{channel.name}' to '{expected_name}'")
            channel.name = expected_name
    
    # Add home team captain
    if fixture.home_team.captain_id:
        existing = ChatParticipant.query.filter_by(
            user_id=fixture.home_team.captain_id, 
            channel_id=channel.id
        ).first()
        if not existing:
            db.session.add(ChatParticipant(
                user_id=fixture.home_team.captain_id, 
                channel_id=channel.id
            ))
            logger.debug(f"Added home captain {fixture.home_team.captain_id} to channel")
    
    # Add away team captain
    if fixture.away_team.captain_id:
        existing = ChatParticipant.query.filter_by(
            user_id=fixture.away_team.captain_id, 
            channel_id=channel.id
        ).first()
        if not existing:
            db.session.add(ChatParticipant(
                user_id=fixture.away_team.captain_id, 
                channel_id=channel.id
            ))
            logger.debug(f"Added away captain {fixture.away_team.captain_id} to channel")
            
    # Add referee if assigned
    if fixture.ref_id:
        existing = ChatParticipant.query.filter_by(
            user_id=fixture.ref_id, 
            channel_id=channel.id
        ).first()
        if not existing:
            db.session.add(ChatParticipant(
                user_id=fixture.ref_id, 
                channel_id=channel.id
            ))
            logger.debug(f"Added referee {fixture.ref_id} to channel")
             
            # Add system message
            db.session.add(ChatMessage(
                channel_id=channel.id, 
                sender_id=fixture.ref_id, 
                content="I have joined the chat as the referee for this match."
            ))
    
    # Don't commit here - let the caller handle the commit
    db.session.flush()
    return channel


# =====================================
# USER SEARCH (Role-based permissions)
# =====================================

@chat.route('/users/search', methods=['GET'])
@login_required
def search_users():
    """Search for users to start a chat with. Role-based filtering."""
    query = request.args.get('q', '').strip()
    
    # Referees cannot search/create chats
    if current_user.role == 'referee':
        return jsonify({'users': []})
    
    # Build base query based on role
    if current_user.role == 'admin':
        # Admin can see all non-admin users
        base_query = User.query.filter(
            User.role.in_(['referee', 'captain']),
            User.id != current_user.id
        )
    elif current_user.role == 'captain':
        # Captains can only see other captains
        base_query = User.query.filter(
            User.role == 'captain',
            User.id != current_user.id
        )
    else:
        return jsonify({'users': []})
    
    # Apply search filter if query provided
    if query:
        users = base_query.filter(
            User.name.ilike(f'%{query}%')
        ).limit(20).all()
    else:
        # Return all eligible users (for group chat selection)
        users = base_query.order_by(User.name).limit(50).all()
    
    # Get current user's chat channel IDs
    my_channels = {p.channel_id for p in ChatParticipant.query.filter_by(user_id=current_user.id).all()}
    
    result = []
    for u in users:
        # Find if there's an existing direct chat
        existing_chat_id = None
        their_channels = {p.channel_id for p in ChatParticipant.query.filter_by(user_id=u.id).all()}
        common = my_channels & their_channels
        
        for chan_id in common:
            chan = ChatChannel.query.get(chan_id)
            if chan and chan.type == 'direct':
                existing_chat_id = chan.id
                break
        
        result.append({
            'id': u.id,
            'name': u.name,
            'role': u.role,
            'existing_chat_id': existing_chat_id
        })
    
    return jsonify({'users': result})

# =====================================
# CHAT MANAGEMENT
# =====================================

@chat.route('/chats/cleanup', methods=['POST'])
@login_required
def cleanup_orphan_chats():
    """Admin endpoint to clean up orphan chats from database."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    deleted_count = 0
    
    # Find orphan game chats (fixture no longer exists)
    game_chats = ChatChannel.query.filter_by(type='game').all()
    for chat in game_chats:
        if chat.fixture_id:
            fixture = Fixture.query.get(chat.fixture_id)
            if not fixture:
                db.session.delete(chat)
                deleted_count += 1
    
    # Find orphan direct chats (less than 2 valid participants)
    direct_chats = ChatChannel.query.filter_by(type='direct').all()
    for chat in direct_chats:
        valid_participants = 0
        for p in chat.participants:
            if p.user_id:
                user = User.query.get(p.user_id)
                if user:
                    valid_participants += 1
        if valid_participants < 2:
            db.session.delete(chat)
            deleted_count += 1
    
    # Find orphan group chats (no valid participants except admin)
    group_chats = ChatChannel.query.filter_by(type='group').all()
    for chat in group_chats:
        valid_non_admin = 0
        for p in chat.participants:
            if p.user_id:
                user = User.query.get(p.user_id)
                if user and user.role != 'admin':
                    valid_non_admin += 1
        if valid_non_admin == 0:
            db.session.delete(chat)
            deleted_count += 1
    
    db.session.commit()
    return jsonify({'message': f'Cleaned up {deleted_count} orphan chats'})


@chat.route('/chats', methods=['GET'])
@login_required
def get_chats():
    """Get all chat channels for the current user, excluding orphan chats."""
    participations = ChatParticipant.query.filter_by(user_id=current_user.id).all()
    
    chats = []
    for p in participations:
        channel = p.channel
        
        # Skip announcements for referees (they shouldn't see them)
        if channel.type == 'announcement' and current_user.role == 'referee':
            continue
        
        # Skip orphan game chats (fixture deleted)
        if channel.type == 'game' and channel.fixture_id:
            fixture = Fixture.query.get(channel.fixture_id)
            if not fixture:
                continue
        
        # Skip orphan direct chats (other participant removed)
        if channel.type == 'direct':
            valid_participants = 0
            for part in channel.participants:
                if part.user_id:
                    user = User.query.get(part.user_id)
                    if user:
                        valid_participants += 1
            if valid_participants < 2:
                continue
        
        chats.append({
            'id': channel.id,
            'name': channel.name,
            'type': channel.type,
            'fixture_id': channel.fixture_id,
            'last_message': channel.get_last_message()
        })
    
    # Sort by last message (most recent first)
    chats.sort(key=lambda c: c['last_message']['timestamp'] if c['last_message'] else '', reverse=True)
    
    return jsonify({'chats': chats})


@chat.route('/chats/direct', methods=['POST'])
@login_required
def create_direct_chat():
    """Create a direct 1-1 chat between current user and another user."""
    data = request.get_json()
    other_user_id = data.get('user_id')
    
    if not other_user_id:
        return jsonify({'error': 'user_id required'}), 400
    
    other_user = User.query.get(other_user_id)
    if not other_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Permission check based on role
    if current_user.role == 'admin':
        pass  # Admin can chat with anyone
    elif current_user.role == 'captain':
        # Captains can only chat with other captains
        if other_user.role != 'captain':
            return jsonify({'error': 'Captains can only create chats with other captains'}), 403
    else:
        # Referees cannot create chats
        return jsonify({'error': 'Referees cannot create chats'}), 403
    
    # Check if direct chat exists between these two
    my_channels = [p.channel_id for p in ChatParticipant.query.filter_by(user_id=current_user.id).all()]
    their_channels = [p.channel_id for p in ChatParticipant.query.filter_by(user_id=other_user_id).all()]
    
    common = set(my_channels) & set(their_channels)
    for chan_id in common:
        chan = ChatChannel.query.get(chan_id)
        if chan.type == 'direct':
            return jsonify({'chat_id': chan.id, 'message': 'Chat already exists', 'existing': True})
    
    # Create new direct chat
    channel = ChatChannel(
        name=f"{current_user.name} & {other_user.name}",
        type='direct'
    )
    db.session.add(channel)
    db.session.flush()
    
    db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel.id))
    db.session.add(ChatParticipant(user_id=other_user_id, channel_id=channel.id))
    
    db.session.commit()
    
    return jsonify({'chat_id': channel.id, 'message': 'Chat created', 'existing': False})


@chat.route('/chats/group', methods=['POST'])
@login_required
def create_group_chat():
    """Create a group chat with multiple users. Admin only."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Only admins can create group chats'}), 403
    
    data = request.get_json()
    name = data.get('name', '').strip()
    user_ids = data.get('user_ids', [])
    
    # Deduplicate user_ids and remove current user
    user_ids = list(set(user_ids) - {current_user.id})
    
    if not user_ids or len(user_ids) < 1:
        return jsonify({'error': 'At least one other user required'}), 400
    
    # Validate all users exist
    users = User.query.filter(User.id.in_(user_ids)).all()
    if len(users) != len(user_ids):
        return jsonify({'error': 'Some users not found'}), 404
    
    # Generate name if not provided
    if not name:
        user_names = [u.name for u in users[:3]]
        name = ', '.join(user_names)
        if len(users) > 3:
            name += f' +{len(users) - 3}'
    
    # Create group channel
    channel = ChatChannel(
        name=name,
        type='group'
    )
    db.session.add(channel)
    db.session.flush()
    
    # Add creator (admin) as participant
    db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel.id))
    
    # Add all selected users (already deduplicated and filtered)
    for user_id in user_ids:
        db.session.add(ChatParticipant(user_id=user_id, channel_id=channel.id))
    
    # Add system message
    db.session.add(ChatMessage(
        channel_id=channel.id,
        sender_id=current_user.id,
        content=f"Group chat created by {current_user.name}"
    ))
    
    db.session.commit()
    
    return jsonify({
        'chat_id': channel.id,
        'message': 'Group chat created',
        'name': name
    })


@chat.route('/chats/announcement', methods=['POST'])
@login_required
def create_announcement():
    """Create an announcement channel. Admin only. Visible to admin + captains."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Only admins can create announcements'}), 403
    
    data = request.get_json()
    title = data.get('title', '').strip() or 'League Announcement'
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'error': 'Announcement content required'}), 400
    
    # Create announcement channel
    channel = ChatChannel(
        name=title,
        type='announcement'
    )
    db.session.add(channel)
    db.session.flush()
    
    # Add admin as participant
    db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel.id))
    
    # Add all captains as participants
    captains = User.query.filter_by(role='captain').all()
    for captain in captains:
        db.session.add(ChatParticipant(user_id=captain.id, channel_id=channel.id))
    
    # Post the announcement content
    db.session.add(ChatMessage(
        channel_id=channel.id,
        sender_id=current_user.id,
        content=content
    ))
    
    db.session.commit()
    
    return jsonify({
        'chat_id': channel.id,
        'message': 'Announcement created',
        'recipients': len(captains) + 1
    })


@chat.route('/chats/<int:channel_id>/messages', methods=['GET'])
@login_required  
def get_messages(channel_id):
    """Get all messages in a channel."""
    # Verify user is a participant
    participant = ChatParticipant.query.filter_by(
        user_id=current_user.id, 
        channel_id=channel_id
    ).first()
    
    if not participant and current_user.role != 'admin':
        return jsonify({'error': 'Not authorized'}), 403
    
    messages = ChatMessage.query.filter_by(channel_id=channel_id).order_by(ChatMessage.timestamp.asc()).all()
    
    return jsonify({'messages': [m.to_dict() for m in messages]})


@chat.route('/chats/<int:channel_id>/messages', methods=['POST'])
@login_required
def send_message(channel_id):
    """Send a message to a channel."""
    # Verify user is a participant
    participant = ChatParticipant.query.filter_by(
        user_id=current_user.id, 
        channel_id=channel_id
    ).first()
    
    # Admin can send to any chat they're viewing
    if not participant and current_user.role != 'admin':
        return jsonify({'error': 'Not authorized'}), 403
    
    # If admin is not a participant, add them
    if not participant and current_user.role == 'admin':
        db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel_id))
    
    data = request.get_json() 
    content = data.get('content')
    
    if not content or not content.strip():
        return jsonify({'error': 'Message cannot be empty'}), 400
    
    msg = ChatMessage(
        channel_id=channel_id,
        sender_id=current_user.id,
        content=content.strip()
    )
    db.session.add(msg)
    db.session.commit()
    
    return jsonify({'message': msg.to_dict()})


@chat.route('/chats/<int:channel_id>', methods=['DELETE'])
@login_required
def delete_chat(channel_id):
    """Delete a chat channel. Admin only."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Only admins can delete chats'}), 403

    channel = ChatChannel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Chat not found'}), 404

    # Delete all messages in the channel
    ChatMessage.query.filter_by(channel_id=channel_id).delete()
    # Delete all participants
    ChatParticipant.query.filter_by(channel_id=channel_id).delete()
    # Delete the channel itself
    db.session.delete(channel)
    db.session.commit()

    return jsonify({'message': f'Chat "{channel.name}" deleted'})
