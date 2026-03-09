"""
WebSocket event handlers for real-time chat functionality.
Uses Flask-SocketIO for bidirectional communication.
"""
from flask_socketio import emit, join_room, leave_room
from flask_login import current_user
from app import db
from app.models import ChatMessage, ChatParticipant, ChatChannel, Notification
import logging

logger = logging.getLogger(__name__)


def register_socket_events(socketio):
    """Register all socket event handlers."""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection - authenticate and auto-join rooms."""
        if not current_user.is_authenticated:
            return False  # Reject unauthenticated connections
        
        # Auto-join all chat rooms user is a participant of
        participations = ChatParticipant.query.filter_by(user_id=current_user.id).all()
        for p in participations:
            join_room(f"chat_{p.channel_id}")
        
        emit('connected', {
            'user_id': current_user.id,
            'rooms_joined': len(participations)
        })
        
        logger.info(f"[Socket] User {current_user.username} connected, joined {len(participations)} rooms")
        return True

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        if current_user.is_authenticated:
            logger.info(f"[Socket] User {current_user.username} disconnected")

    @socketio.on('join_channel')
    def handle_join_channel(data):
        """Join a specific chat channel room."""
        channel_id = data.get('channel_id')
        if not channel_id:
            return
        
        # Verify user is a participant
        participant = ChatParticipant.query.filter_by(
            user_id=current_user.id,
            channel_id=channel_id
        ).first()
        
        if not participant and current_user.role != 'admin':
            emit('error', {'message': 'Not authorized to join this channel'})
            return
        
        room = f"chat_{channel_id}"
        join_room(room)
        emit('joined_channel', {'channel_id': channel_id})

    @socketio.on('leave_channel')
    def handle_leave_channel(data):
        """Leave a chat channel room."""
        channel_id = data.get('channel_id')
        if channel_id:
            leave_room(f"chat_{channel_id}")
            emit('left_channel', {'channel_id': channel_id})

    @socketio.on('send_message')
    def handle_send_message(data):
        """Receive a message, save to DB, and broadcast to room."""
        channel_id = data.get('channel_id')
        content = data.get('content')
        
        if not channel_id or not content:
            emit('error', {'message': 'Missing channel_id or content'})
            return
        
        # Verify user is a participant
        participant = ChatParticipant.query.filter_by(
            user_id=current_user.id,
            channel_id=channel_id
        ).first()
        
        if not participant:
            emit('error', {'message': 'Not authorized to send to this channel'})
            return
        
        # Save message to database
        try:
            msg = ChatMessage(
                channel_id=channel_id,
                sender_id=current_user.id,
                content=content.strip()
            )
            db.session.add(msg)
            
            # Create notifications for all other participants
            channel = ChatChannel.query.get(channel_id)
            participants = ChatParticipant.query.filter_by(channel_id=channel_id).all()
            
            for p in participants:
                if p.user_id and p.user_id != current_user.id:
                    # Truncate content for notification preview
                    preview = content[:50] + '...' if len(content) > 50 else content
                    db.session.add(Notification(
                        user_id=p.user_id,
                        title=f"New message in {channel.name}",
                        message=f"{current_user.name}: {preview}",
                        type='info'
                    ))
            
            db.session.commit()
            
            # Broadcast to all participants in the room
            room = f"chat_{channel_id}"
            emit('new_message', msg.to_dict(), room=room)
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error sending message: {e}")
            emit('error', {'message': 'Failed to send message'})

    @socketio.on('typing')
    def handle_typing(data):
        """Broadcast typing indicator to other participants."""
        channel_id = data.get('channel_id')
        is_typing = data.get('is_typing', False)
        
        if channel_id:
            room = f"chat_{channel_id}"
            emit('user_typing', {
                'user_id': current_user.id,
                'user_name': current_user.name,
                'is_typing': is_typing
            }, room=room, include_self=False)

    @socketio.on('mark_read')
    def handle_mark_read(data):
        """Update last read timestamp for a channel."""
        channel_id = data.get('channel_id')
        if not channel_id:
            return
            
        participant = ChatParticipant.query.filter_by(
            user_id=current_user.id,
            channel_id=channel_id
        ).first()
        
        if participant:
            from datetime import datetime, timezone
            participant.last_read_at = datetime.now(timezone.utc)
            db.session.commit()
