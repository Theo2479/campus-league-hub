"""
Referee routes for availability management and game operations.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import (
    Fixture, RefereeAvailability, SystemSetting, User,
    ChatChannel, ChatParticipant, ChatMessage
)
from app.utils.decorators import require_role
from app.utils.notifications import notify_user, notify_admins
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

referee = Blueprint('referee', __name__)


@referee.route('/fixtures/available', methods=['GET'])
@login_required
@require_role('referee')
def get_available_fixtures():
    """Get available time slots for referees to sign up, filtered by Admin Window."""
    # Get window settings
    w_start = SystemSetting.query.get('ref_window_start')
    w_end = SystemSetting.query.get('ref_window_end')
    
    query = Fixture.query.filter(Fixture.ref_id == None, Fixture.status == 'scheduled')
    
    # Filter by window date range
    if w_start and w_start.value:
        try:
            s_date = datetime.strptime(w_start.value, '%Y-%m-%d').date()
            query = query.filter(Fixture.date >= s_date)
        except ValueError:
            pass
    else:
        query = query.filter(Fixture.date >= datetime.now().date())

    if w_end and w_end.value:
        try:
            e_date = datetime.strptime(w_end.value, '%Y-%m-%d').date()
            query = query.filter(Fixture.date < (e_date + timedelta(days=1)))
        except ValueError:
            pass

    fixtures = query.order_by(Fixture.date, Fixture.time_slot).all()
    
    # Group by (date, time)
    slots_map = {}
    for f in fixtures:
        if not f.date or not f.time_slot:
            continue
        
        date_str = f.date.date().isoformat()
        key = (date_str, f.time_slot)
        
        if key not in slots_map:
            slots_map[key] = {
                'date': date_str,
                'time': f.time_slot,
                'game_count': 0,
                'is_available': False,
                'total_ref_count': 0
            }
        slots_map[key]['game_count'] += 1

    # Get ref counts (supply)
    ref_counts = db.session.query(
        RefereeAvailability.date, 
        RefereeAvailability.time_slot, 
        func.count(RefereeAvailability.id)
    ).group_by(RefereeAvailability.date, RefereeAvailability.time_slot).all()
    
    ref_counts_map = {}
    for r_date, r_time, count in ref_counts:
        ref_counts_map[(r_date.isoformat(), r_time)] = count
        
    # Inject counts
    for key, slot in slots_map.items():
        slot['total_ref_count'] = ref_counts_map.get(key, 0)

    # Check user availability
    user_avail = RefereeAvailability.query.filter(
        RefereeAvailability.user_id == current_user.id,
        RefereeAvailability.date >= datetime.now().date()
    ).all()
    
    for avail in user_avail:
        key = (avail.date.isoformat(), avail.time_slot)
        if key in slots_map:
            slots_map[key]['is_available'] = True
            # Show OTHER refs count (subtract self)
            if slots_map[key]['total_ref_count'] > 0:
                slots_map[key]['total_ref_count'] -= 1

    result = list(slots_map.values())
    result.sort(key=lambda x: (x['date'], x['time']))
    
    return jsonify({'slots': result})


@referee.route('/referee/availability', methods=['POST'])
@login_required
@require_role('referee')
def add_availability():
    """Allow a referee to express availability for a slot."""
    data = request.get_json()
    date_str = data.get('date')
    time_slot = data.get('time')
    
    if not date_str or not time_slot:
        return jsonify({'error': 'Date and time required'}), 400
        
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Check if already exists
    existing = RefereeAvailability.query.filter_by(
        user_id=current_user.id,
        date=date_obj,
        time_slot=time_slot
    ).first()
    
    if existing:
        return jsonify({'message': 'Already marked available'}), 200
        
    avail = RefereeAvailability(
        user_id=current_user.id, 
        date=date_obj, 
        time_slot=time_slot
    )
    db.session.add(avail)
    db.session.commit()
    
    return jsonify({'message': f'Marked available for {date_str} at {time_slot}'})


@referee.route('/referee/availability', methods=['DELETE'])
@login_required
@require_role('referee')
def remove_availability():
    """Allow a referee to withdraw availability."""
    data = request.get_json()
    date_str = data.get('date')
    time_slot = data.get('time')
    
    if not date_str or not time_slot:
        return jsonify({'error': 'Date and time required'}), 400
        
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    avail = RefereeAvailability.query.filter_by(
        user_id=current_user.id,
        date=date_obj,
        time_slot=time_slot
    ).first()
    
    if not avail:
        return jsonify({'error': 'Not marked available'}), 404
    
    db.session.delete(avail)
    db.session.commit()
    
    return jsonify({'message': 'Successfully removed availability'})


@referee.route('/referee/my-games', methods=['GET'])
@login_required
@require_role('referee')
def get_my_games():
    """Get all fixtures the current referee is assigned to, AND dropped games available for pickup."""
    # Assigned games
    assigned = Fixture.query.filter(
        Fixture.ref_id == current_user.id
    ).order_by(Fixture.date).all()
    
    # Open games: only games where ref dropped out (not all unassigned games)
    open_games = Fixture.query.filter(
        Fixture.ref_id == None,
        Fixture.ref_dropped == True,  # Only show games that had a ref who dropped out
        Fixture.status == 'scheduled',
        Fixture.date >= datetime.now().date()
    ).order_by(Fixture.date).all()
    
    return jsonify({
        'assigned': [f.to_dict() for f in assigned],
        'open': [f.to_dict() for f in open_games]
    })


@referee.route('/referee/games/<int:game_id>/dropout', methods=['POST'])
@login_required
@require_role('referee')
def dropout_game(game_id):
    """Ref drops out of a game. Notifications sent to everyone."""
    fixture = Fixture.query.get(game_id)
    if not fixture:
        return jsonify({'error': 'Game not found'}), 404
        
    if fixture.ref_id != current_user.id:
        return jsonify({'error': 'You are not assigned to this game'}), 400
        
    # Unassign and mark as dropped
    fixture.ref_id = None
    fixture.ref_dropped = True  # Flag for open games list
    db.session.add(fixture)
    
    # Notify all admins (fixes bug: was only notifying first admin)
    notify_admins(
        "Referee Usage Alert: Dropout",
        f"Referee {current_user.name} dropped out of {fixture.home_team.name} vs {fixture.away_team.name} on {fixture.date.strftime('%Y-%m-%d')}.",
        'urgent'
    )

    # Notify captains
    home_team = fixture.home_team
    away_team = fixture.away_team

    if home_team.captain_id:
        notify_user(
            home_team.captain_id,
            "Referee Update",
            f"The referee for your game vs {away_team.name} has dropped out. We are looking for a replacement.",
            'urgent'
        )

    if away_team.captain_id:
        notify_user(
            away_team.captain_id,
            "Referee Update",
            f"The referee for your game vs {home_team.name} has dropped out. We are looking for a replacement.",
            'urgent'
        )

    # Notify all other referees
    other_refs = User.query.filter(User.role == 'referee', User.id != current_user.id).all()
    for ref in other_refs:
        notify_user(
            ref.id,
            "Urgent Coverage Needed",
            f"A game has become available! {fixture.home_team.name} vs {fixture.away_team.name} on {fixture.date.strftime('%Y-%m-%d %H:%M')}. First to claim gets it.",
            'info'
        )
        
    # Chat cleanup: Remove ref from chat
    chat = ChatChannel.query.filter_by(fixture_id=fixture.id, type='game').first()
    if chat:
        part = ChatParticipant.query.filter_by(user_id=current_user.id, channel_id=chat.id).first()
        if part:
            db.session.delete(part)
            db.session.add(ChatMessage(
                channel_id=chat.id, 
                sender_id=current_user.id, 
                content="Referee has left the chat (dropped out)."
            ))
        
    db.session.commit()
    
    return jsonify({'message': 'Successfully dropped out. Relevant parties notified.'})


@referee.route('/referee/games/<int:game_id>/pickup', methods=['POST'])
@login_required
@require_role('referee')
def pickup_game(game_id):
    """Ref picks up an open game (First Come First Served)."""
    fixture = Fixture.query.get(game_id)
    if not fixture:
        return jsonify({'error': 'Game not found'}), 404
        
    if fixture.ref_id is not None:
        return jsonify({'error': 'This game has already been taken by another referee.'}), 400
        
    # Assign to current user and clear dropped flag
    fixture.ref_id = current_user.id
    fixture.ref_dropped = False  # Clear the flag
    db.session.add(fixture)
    
    # Notify all admins (fixes bug: was only notifying first admin)
    notify_admins(
        "Referee Coverage Found",
        f"Referee {current_user.name} picked up {fixture.home_team.name} vs {fixture.away_team.name}.",
        'success'
    )

    # Notify captains
    home_team = fixture.home_team
    away_team = fixture.away_team

    if home_team.captain_id:
        notify_user(
            home_team.captain_id,
            "Referee Assigned",
            f"A new referee ({current_user.name}) has been assigned to your game vs {away_team.name}.",
            'success'
        )

    if away_team.captain_id:
        notify_user(
            away_team.captain_id,
            "Referee Assigned",
            f"A new referee ({current_user.name}) has been assigned to your game vs {home_team.name}.",
            'success'
        )
        
    # Commit the fixture assignment first
    db.session.commit()
    
    # Now ensure chat is created with correct team data
    from app.routes.chat import ensure_game_chat
    ensure_game_chat(fixture.id)
    db.session.commit()  # Commit chat changes
    
    return jsonify({'message': 'Game successfully claimed!'})
