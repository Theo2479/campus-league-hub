"""
Admin routes — pitch management.
"""
from flask import jsonify, request
from flask_login import login_required
from app import db
from app.models import Pitch, PitchAvailability, Fixture
from app.utils.decorators import require_role
import logging
from datetime import datetime

from app.routes.admin import admin

logger = logging.getLogger(__name__)


@admin.route('/admin/pitches', methods=['GET'])
@login_required
@require_role('admin')
def get_pitches():
    """Get all pitches with availability."""
    pitches = Pitch.query.all()
    result = []
    for p in pitches:
        p_dict = p.to_dict()
        avail = PitchAvailability.query.filter_by(pitch_id=p.id).all()
        p_dict['availability'] = [a.to_dict() for a in avail]
        result.append(p_dict)

    return jsonify({'pitches': result})


@admin.route('/admin/pitches', methods=['POST'])
@login_required
@require_role('admin')
def create_pitch():
    """Create a new pitch."""
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    pitch = Pitch(name=name)
    db.session.add(pitch)
    db.session.commit()

    return jsonify({'message': 'Pitch created', 'pitch': pitch.to_dict()})


@admin.route('/admin/pitches/<int:pitch_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_pitch(pitch_id):
    """Delete a pitch."""
    pitch = Pitch.query.get(pitch_id)
    if not pitch:
        return jsonify({'error': 'Pitch not found'}), 404

    try:
        PitchAvailability.query.filter_by(pitch_id=pitch_id).delete()
        db.session.delete(pitch)
        db.session.commit()
        return jsonify({'message': 'Pitch deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting pitch: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@admin.route('/admin/pitches/<int:pitch_id>/availability', methods=['POST'])
@login_required
@require_role('admin')
def update_pitch_availability(pitch_id):
    """Add or update availability for a specific date."""
    pitch = Pitch.query.get(pitch_id)
    if not pitch:
        return jsonify({'error': 'Pitch not found'}), 404

    data = request.get_json()
    date_str = data.get('date')
    slots = data.get('slots')

    if not date_str:
        return jsonify({'error': 'Date is required'}), 400

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    if slots:
        for slot in slots:
            pa = PitchAvailability(pitch_id=pitch_id, date=date_obj, time_slot=slot)
            db.session.add(pa)

    db.session.commit()

    return jsonify({'message': 'Availability updated'})


@admin.route('/admin/pitches/<int:pitch_id>/availability/bulk', methods=['POST'])
@login_required
@require_role('admin')
def bulk_add_availability(pitch_id):
    """Add availability for multiple dates at once."""
    pitch = Pitch.query.get(pitch_id)
    if not pitch:
        return jsonify({'error': 'Pitch not found'}), 404

    data = request.get_json()
    dates = data.get('dates', [])
    slots = data.get('slots', [])

    if not dates or not slots:
        return jsonify({'error': 'Dates and slots are required'}), 400

    added = 0
    for date_str in dates:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            for slot in slots:
                existing = PitchAvailability.query.filter_by(
                    pitch_id=pitch_id, date=date_obj, time_slot=slot
                ).first()
                if not existing:
                    pa = PitchAvailability(pitch_id=pitch_id, date=date_obj, time_slot=slot)
                    db.session.add(pa)
                    added += 1
        except ValueError:
            continue

    db.session.commit()

    return jsonify({'message': f'Added {added} availability slots'})


@admin.route('/admin/pitches/availability/clear', methods=['POST'])
@login_required
@require_role('admin')
def bulk_clear_availability():
    """Clear availability for a date range."""
    data = request.get_json()
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    pitch_id = data.get('pitch_id')
    day_of_week = data.get('day_of_week')

    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Start and end dates are required'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    query = PitchAvailability.query.filter(
        PitchAvailability.date >= start_date,
        PitchAvailability.date <= end_date
    )

    if pitch_id:
        query = query.filter(PitchAvailability.pitch_id == pitch_id)

    if day_of_week is not None:
        candidates = query.all()
        deleted = 0
        for slot in candidates:
            if slot.date.weekday() == int(day_of_week):
                db.session.delete(slot)
                deleted += 1
    else:
        deleted = query.delete(synchronize_session=False)

    db.session.commit()
    return jsonify({'message': f'Cleared {deleted} slots'})


@admin.route('/admin/pitches/<int:pitch_id>/availability/<int:slot_id>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_availability_slot(pitch_id, slot_id):
    """Delete a specific availability slot."""
    slot = PitchAvailability.query.filter_by(id=slot_id, pitch_id=pitch_id).first()
    if not slot:
        return jsonify({'error': 'Slot not found'}), 404

    db.session.delete(slot)
    db.session.commit()

    return jsonify({'message': 'Slot deleted'})


@admin.route('/admin/pitches/availability-summary', methods=['GET'])
@login_required
@require_role('admin')
def get_availability_summary():
    """Get all pitch availability with booking status."""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    pitches = Pitch.query.all()

    scheduled_fixtures = Fixture.query.filter(
        Fixture.status.in_(['scheduled', 'completed'])
    ).all()

    booked_slots = set()
    for f in scheduled_fixtures:
        if f.pitch and f.time_slot and f.date:
            date_iso = f.date.date().isoformat() if hasattr(f.date, 'date') else f.date.isoformat()
            booked_slots.add((f.pitch, date_iso, f.time_slot))

    result = []
    for pitch in pitches:
        pitch_data = {
            'id': pitch.id,
            'name': pitch.name,
            'status': pitch.status,
            'slots': []
        }

        query = PitchAvailability.query.filter_by(pitch_id=pitch.id)

        if start_date_str:
            try:
                start = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                query = query.filter(PitchAvailability.date >= start)
            except ValueError:
                pass

        if end_date_str:
            try:
                end = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                query = query.filter(PitchAvailability.date <= end)
            except ValueError:
                pass

        availabilities = query.order_by(PitchAvailability.date, PitchAvailability.time_slot).all()

        for avail in availabilities:
            date_iso = avail.date.isoformat() if avail.date else None
            is_booked = (pitch.name, date_iso, avail.time_slot) in booked_slots
            pitch_data['slots'].append({
                'id': avail.id,
                'date': date_iso,
                'day_of_week': avail.date.strftime("%A") if avail.date else None,
                'time_slot': avail.time_slot,
                'is_booked': is_booked
            })

        result.append(pitch_data)

    return jsonify({'pitches': result})
