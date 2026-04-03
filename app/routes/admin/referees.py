"""
Admin routes — referee management.
"""
from flask import jsonify, request
from flask_login import login_required
from app import db
from app.models import User, RefereeAvailability, Notification
from app.utils.decorators import require_role
import logging

from app.routes.admin import admin

logger = logging.getLogger(__name__)


@admin.route('/admin/referees', methods=['GET'])
@login_required
@require_role('admin')
def get_all_referees():
    """Get all referee accounts with detailed stats."""
    referees = User.query.filter_by(role='referee').all()

    referee_list = []
    for r in referees:
        games_completed = r.reffed_games.filter_by(status='completed').count()
        games_assigned = r.reffed_games.count()
        availability_submissions = RefereeAvailability.query.filter_by(user_id=r.id).count()

        referee_list.append({
            'id': r.id,
            'username': r.username,
            'name': r.name,
            'phone': r.phone,
            'games_reffed': games_completed,
            'games_assigned': games_assigned,
            'availability_submissions': availability_submissions
        })

    return jsonify({
        'referees': referee_list,
        'count': len(referees)
    })


@admin.route('/admin/referees', methods=['POST'])
@login_required
@require_role('admin')
def create_referee():
    """Create a new referee account with auto-chat to admin."""
    from flask_login import current_user
    data = request.get_json()

    username = data.get('username')
    name = data.get('name')
    phone = data.get('phone', '')
    password = data.get('password')

    if not username:
        return jsonify({'error': 'Username is required'}), 400

    if not password or len(password) < 8:
        return jsonify({'error': 'Password is required and must be at least 8 characters'}), 400

    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({'error': 'Username already exists'}), 400

    referee = User(
        username=username,
        name=name or username,
        phone=phone,
        role='referee'
    )
    referee.set_password(password)

    db.session.add(referee)
    db.session.flush()

    from app.models import ChatChannel, ChatParticipant, ChatMessage
    channel = ChatChannel(
        name=f"Admin & {referee.name}",
        type='direct'
    )
    db.session.add(channel)
    db.session.flush()

    db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel.id))
    db.session.add(ChatParticipant(user_id=referee.id, channel_id=channel.id))
    db.session.add(ChatMessage(
        channel_id=channel.id,
        sender_id=current_user.id,
        content=f"Welcome {referee.name}! This is your direct line to the admin."
    ))

    db.session.commit()

    return jsonify({
        'message': 'Referee account created successfully',
        'referee': {
            'id': referee.id,
            'username': referee.username,
            'name': referee.name,
            'phone': referee.phone
        }
    })


@admin.route('/admin/referees/<int:referee_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_referee(referee_id):
    """Delete a referee account and clean up orphan chats."""
    referee = User.query.get(referee_id)

    if not referee:
        return jsonify({'error': 'Referee not found'}), 404

    if referee.role != 'referee':
        return jsonify({'error': 'User is not a referee'}), 400

    for fixture in referee.reffed_games:
        fixture.ref_id = None

    RefereeAvailability.query.filter_by(user_id=referee_id).delete()
    Notification.query.filter_by(user_id=referee_id).delete()

    from app.models import ChatMessage, ChatParticipant, ChatChannel
    user_channels = [p.channel_id for p in ChatParticipant.query.filter_by(user_id=referee_id).all()]

    ChatMessage.query.filter_by(sender_id=referee_id).delete()
    ChatParticipant.query.filter_by(user_id=referee_id).delete()

    for channel_id in user_channels:
        channel = ChatChannel.query.get(channel_id)
        if channel and channel.type == 'direct':
            remaining = ChatParticipant.query.filter_by(channel_id=channel_id).count()
            if remaining <= 1:
                db.session.delete(channel)

    db.session.delete(referee)
    db.session.commit()

    return jsonify({'message': 'Referee deleted successfully'})


@admin.route('/admin/referee-coverage', methods=['POST'])
@login_required
@require_role('admin')
def get_referee_coverage():
    """Get summary of game demand vs referee supply per slot."""
    from app.models import Fixture
    from datetime import datetime

    data = request.get_json()
    start_str = data.get('startDate')
    end_str = data.get('endDate')

    if not start_str or not end_str:
        return jsonify({'error': 'Date range required'}), 400

    try:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    fixtures = Fixture.query.filter(
        Fixture.date >= start_date,
        Fixture.date <= end_date,
        Fixture.status == 'scheduled'
    ).all()

    slots = {}

    for f in fixtures:
        if not f.date or not f.time_slot:
            continue
        d_str = f.date.date().isoformat()
        t_str = f.time_slot
        key = (d_str, t_str)

        if key not in slots:
            slots[key] = {'date': d_str, 'time': t_str, 'game_count': 0, 'ref_count': 0}

        slots[key]['game_count'] += 1

    avails = RefereeAvailability.query.filter(
        RefereeAvailability.date >= start_date,
        RefereeAvailability.date <= end_date
    ).all()

    for a in avails:
        d_str = a.date.isoformat()
        t_str = a.time_slot
        key = (d_str, t_str)

        if key not in slots:
            slots[key] = {'date': d_str, 'time': t_str, 'game_count': 0, 'ref_count': 0}

        slots[key]['ref_count'] += 1

    result = list(slots.values())
    result.sort(key=lambda x: (x['date'], x['time']))

    return jsonify({'slots': result})


@admin.route('/admin/allocate', methods=['POST'])
@login_required
@require_role('admin')
def allocate_games():
    """Trigger the allocation algorithm."""
    from datetime import datetime

    data = request.get_json()
    start_date_str = data.get('startDate')
    end_date_str = data.get('endDate')

    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Missing date range'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    from app.utils.allocator import allocate_referees
    allocations = allocate_referees(start_date, end_date)

    db.session.commit()

    from app.routes.chat import ensure_game_chat
    for alloc in allocations:
        fid = alloc.get('fixture_id')
        if fid:
            ensure_game_chat(fid)

    db.session.commit()

    return jsonify({
        'message': f'Allocation complete. Assigned {len(allocations)} fixtures.',
        'allocations': allocations
    })


@admin.route('/admin/availability-window', methods=['GET', 'POST'])
@login_required
def manage_availability_window():
    """Get or set the referee availability window."""
    from flask_login import current_user
    from app.models import SystemSetting

    if request.method == 'GET':
        if current_user.role not in ['admin', 'referee']:
            return jsonify({'error': 'Unauthorized'}), 403

        start = SystemSetting.query.get('ref_window_start')
        end = SystemSetting.query.get('ref_window_end')
        is_open = SystemSetting.query.get('ref_window_open')

        return jsonify({
            'startDate': start.value if start else None,
            'endDate': end.value if end else None,
            'isOpen': is_open.value == 'true' if is_open else False
        })

    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    start_str = data.get('startDate')
    end_str = data.get('endDate')
    is_open = data.get('isOpen')

    if start_str is not None:
        setting = SystemSetting.query.get('ref_window_start') or SystemSetting(key='ref_window_start')
        setting.value = start_str
        db.session.add(setting)

    if end_str is not None:
        setting = SystemSetting.query.get('ref_window_end') or SystemSetting(key='ref_window_end')
        setting.value = end_str
        db.session.add(setting)

    if is_open is not None:
        setting = SystemSetting.query.get('ref_window_open') or SystemSetting(key='ref_window_open')
        setting.value = 'true' if is_open else 'false'
        db.session.add(setting)

    db.session.commit()
    return jsonify({'message': 'Settings updated'})
