"""
Admin routes — fixture management.
"""
from flask import jsonify, request
from flask_login import login_required
from app import db
from app.models import Team, Fixture, Notification
from app.utils.decorators import require_role
from app.utils.notifications import notify_user
import logging
from datetime import datetime, timezone
from sqlalchemy import func

from app.routes.admin import admin

logger = logging.getLogger(__name__)


@admin.route('/admin/fixtures', methods=['POST'])
@login_required
@require_role('admin')
def create_fixture():
    """Create a new fixture."""
    data = request.get_json()

    home_name = data.get('homeTeam')
    away_name = data.get('awayTeam')

    h_team = Team.query.filter_by(name=home_name).first()
    a_team = Team.query.filter_by(name=away_name).first()

    if not h_team or not a_team:
        return jsonify({'error': 'Teams not found'}), 400

    try:
        date_obj = datetime.strptime(data.get('date'), '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400

    fixture = Fixture(
        home_team_id=h_team.id,
        away_team_id=a_team.id,
        date=date_obj,
        time_slot=data.get('time'),
        pitch=data.get('venue'),
        status=data.get('status', 'scheduled'),
        ref_id=data.get('refereeId')
    )

    if data.get('homeScore') is not None:
        fixture.home_score = int(data.get('homeScore'))
    if data.get('awayScore') is not None:
        fixture.away_score = int(data.get('awayScore'))

    db.session.add(fixture)
    db.session.commit()

    return jsonify({'message': 'Fixture created', 'fixture': fixture.to_dict()})


@admin.route('/admin/fixtures/<int:fixture_id>', methods=['PUT'])
@login_required
@require_role('admin')
def update_fixture(fixture_id):
    """Update a fixture and notify affected users of changes."""
    fixture = Fixture.query.get(fixture_id)
    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404

    data = request.get_json()

    changes = []
    old_status = fixture.status
    old_pitch = fixture.pitch
    old_time = fixture.time_slot
    old_date = fixture.date

    if 'homeTeam' in data:
        t = Team.query.filter_by(name=data['homeTeam']).first()
        if t:
            fixture.home_team_id = t.id

    if 'awayTeam' in data:
        t = Team.query.filter_by(name=data['awayTeam']).first()
        if t:
            fixture.away_team_id = t.id

    if 'date' in data:
        try:
            new_date = datetime.strptime(data['date'], '%Y-%m-%d')
            if old_date and new_date.date() != old_date.date():
                changes.append(('date', old_date.strftime('%Y-%m-%d'), new_date.strftime('%Y-%m-%d')))
            fixture.date = new_date
        except (ValueError, TypeError):
            pass

    if 'time' in data:
        if old_time != data['time']:
            changes.append(('time', old_time, data['time']))
        fixture.time_slot = data['time']

    if 'venue' in data:
        if old_pitch != data['venue']:
            changes.append(('pitch', old_pitch, data['venue']))
        fixture.pitch = data['venue']

    if 'status' in data:
        if old_status != data['status']:
            changes.append(('status', old_status, data['status']))
        fixture.status = data['status']

    if 'refereeId' in data:
        fixture.ref_id = data['refereeId']

    if data.get('homeScore') is not None:
        fixture.home_score = int(data.get('homeScore'))
    if data.get('awayScore') is not None:
        fixture.away_score = int(data.get('awayScore'))

    if changes:
        game_name = f"{fixture.home_team.name} vs {fixture.away_team.name}"
        recipients = []

        if fixture.ref_id:
            recipients.append(fixture.ref_id)

        if fixture.home_team.captain_id:
            recipients.append(fixture.home_team.captain_id)
        if fixture.away_team.captain_id:
            recipients.append(fixture.away_team.captain_id)

        for change_type, old_val, new_val in changes:
            if change_type == 'status':
                if new_val in ['cancelled', 'postponed']:
                    notif_type = 'urgent'
                    title = f"Game {new_val.capitalize()}"
                    message = f"{game_name} has been {new_val}."
                else:
                    notif_type = 'success'
                    title = "Game Status Updated"
                    message = f"{game_name} status changed to {new_val}."
            elif change_type == 'date':
                notif_type = 'urgent'
                title = "Game Date Changed"
                message = f"{game_name} moved from {old_val} to {new_val}."
            elif change_type == 'time':
                notif_type = 'urgent'
                title = "Game Time Changed"
                message = f"{game_name} time changed from {old_val or 'TBD'} to {new_val}."
            elif change_type == 'pitch':
                notif_type = 'info'
                title = "Venue Changed"
                message = f"{game_name} venue changed from {old_val or 'TBD'} to {new_val}."

            for user_id in recipients:
                notify_user(user_id, title, message, notif_type)

    db.session.commit()
    return jsonify({'message': 'Fixture updated', 'fixture': fixture.to_dict()})


@admin.route('/admin/fixtures/<int:fixture_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_fixture(fixture_id):
    """Delete a fixture and its associated chat."""
    fixture = Fixture.query.get(fixture_id)

    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404

    from app.models import ChatChannel
    chat = ChatChannel.query.filter_by(fixture_id=fixture_id, type='game').first()
    if chat:
        db.session.delete(chat)

    db.session.delete(fixture)
    db.session.commit()
    return jsonify({'message': 'Fixture deleted'})


@admin.route('/admin/fixtures/cancel-day', methods=['POST'])
@login_required
@require_role('admin')
def cancel_fixtures_by_day():
    """Cancel all fixtures on a specific day."""
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({'error': 'Date is required'}), 400

    try:
        target_date_str = data['date']
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = datetime.combine(target_date, datetime.max.time())

    fixtures = Fixture.query.filter(
        Fixture.date >= start_of_day,
        Fixture.date <= end_of_day,
        Fixture.status.in_(['scheduled', 'postponed'])
    ).all()

    count = 0
    for f in fixtures:
        f.status = 'cancelled'
        count += 1

    if count > 0:
        db.session.commit()

    return jsonify({
        'message': f'Successfully cancelled {count} games for {target_date_str}',
        'count': count,
        'date': target_date_str
    })


@admin.route('/admin/fixtures/cancel-day-emergency', methods=['POST'])
@login_required
@require_role('admin')
def emergency_cancel_day():
    """Emergency cancel with notifications."""
    data = request.get_json()
    date_str = data.get('date')
    reason_id = data.get('reason')
    message = data.get('message', '')

    if not date_str:
        return jsonify({'error': 'Date required'}), 400

    try:
        cancel_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400

    fixtures = Fixture.query.filter(
        func.date(Fixture.date) == cancel_date,
        Fixture.status == 'scheduled'
    ).all()

    count = 0
    for f in fixtures:
        f.status = 'cancelled'
        count += 1

        if f.ref_id:
            notify_user(
                f.ref_id,
                "Fixture Cancelled (Emergency)",
                f"Game {f.home_team.name} vs {f.away_team.name} on {date_str} cancelled: {reason_id}. {message}",
                'urgent'
            )

        caps = []
        if f.home_team.captain_id:
            caps.append((f.home_team.captain_id, f.away_team.name))
        if f.away_team.captain_id:
            caps.append((f.away_team.captain_id, f.home_team.name))

        for cap_id, opponent in caps:
            notify_user(
                cap_id,
                "Fixture Cancelled (Emergency)",
                f"Game vs {opponent} cancelled: {reason_id}. {message}",
                'urgent'
            )

    db.session.commit()
    return jsonify({'message': f'Cancelled {count} games', 'count': count})


@admin.route('/admin/fixtures/<int:fixture_id>/reschedule', methods=['POST'])
@login_required
@require_role('admin')
def reschedule_fixture(fixture_id):
    """Reschedule a postponed fixture to a new date/time/pitch."""
    fixture = Fixture.query.get_or_404(fixture_id)

    if fixture.status != 'postponed':
        return jsonify({'error': 'Only postponed fixtures can be rescheduled'}), 400

    data = request.get_json()
    new_date = data.get('date')
    new_time = data.get('time_slot')
    new_pitch = data.get('pitch')

    if not new_date or not new_time or not new_pitch:
        return jsonify({'error': 'Date, time_slot, and pitch are required'}), 400

    fixture.date = datetime.strptime(new_date, '%Y-%m-%d')
    fixture.time_slot = new_time
    fixture.pitch = new_pitch
    fixture.status = 'scheduled'

    teams = [fixture.home_team, fixture.away_team]
    for t in teams:
        if t.captain_id:
            opponent = fixture.away_team.name if t.id == fixture.home_team_id else fixture.home_team.name
            notify_user(
                t.captain_id,
                "Match Rescheduled",
                f"Your match vs {opponent} has been rescheduled to {new_date} at {new_time} ({new_pitch}).",
                'info'
            )

    if fixture.ref_id:
        notify_user(
            fixture.ref_id,
            "Match Rescheduled",
            f"Match {fixture.home_team.name} vs {fixture.away_team.name} rescheduled to {new_date} at {new_time} ({new_pitch}).",
            'info'
        )

    db.session.commit()
    return jsonify({'message': 'Fixture rescheduled successfully', 'fixture': fixture.to_dict()})
