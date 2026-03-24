"""
Admin routes for managing referees, captains, pitches, leagues, divisions, teams, and fixtures.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import (
    Fixture, Team, Division, RefereeAvailability, League, Player,
    SystemSetting, Notification, User, Pitch, PitchAvailability,
    Tournament, tournament_teams
)
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

admin = Blueprint('admin', __name__)


# =====================================
# REFEREE MANAGEMENT
# =====================================

@admin.route('/admin/referees', methods=['GET'])
@login_required
def get_all_referees():
    """Get all referee accounts with detailed stats."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
def create_referee():
    """Create a new referee account with auto-chat to admin."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
    db.session.flush()  # Get referee.id
    
    # Create auto-chat with admin
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
def delete_referee(referee_id):
    """Delete a referee account and clean up orphan chats."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    referee = User.query.get(referee_id)
    
    if not referee:
        return jsonify({'error': 'Referee not found'}), 404
    
    if referee.role != 'referee':
        return jsonify({'error': 'User is not a referee'}), 400
    
    # Unassign from fixtures
    for fixture in referee.reffed_games:
        fixture.ref_id = None
    
    # Delete availability records
    RefereeAvailability.query.filter_by(user_id=referee_id).delete()
    
    # Delete notifications
    Notification.query.filter_by(user_id=referee_id).delete()
    
    # Clean up chat data
    from app.models import ChatMessage, ChatParticipant, ChatChannel
    
    # Get the user's direct chat channel IDs before deleting participations
    user_channels = [p.channel_id for p in ChatParticipant.query.filter_by(user_id=referee_id).all()]
    
    # Delete messages and participations
    ChatMessage.query.filter_by(sender_id=referee_id).delete()
    ChatParticipant.query.filter_by(user_id=referee_id).delete()
    
    # Delete orphan direct chats (chats with no participants left)
    for channel_id in user_channels:
        channel = ChatChannel.query.get(channel_id)
        if channel and channel.type == 'direct':
            remaining = ChatParticipant.query.filter_by(channel_id=channel_id).count()
            if remaining <= 1:  # Only 1 or 0 participants left
                db.session.delete(channel)
    
    db.session.delete(referee)
    db.session.commit()
    
    return jsonify({'message': 'Referee deleted successfully'})


# =====================================
# CAPTAIN MANAGEMENT
# =====================================

@admin.route('/admin/captains', methods=['GET'])
@login_required
def get_all_captains():
    """Get all captain accounts with team info."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
def create_captain():
    """Create a new captain account with auto-chat to admin."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
    if not password or len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    captain.set_password(password)
    
    db.session.add(captain)
    db.session.flush()
    
    if team:
        team.captain_id = captain.id
    
    # Create auto-chat with admin
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
def delete_captain(captain_id):
    """Delete a captain account and clean up orphan chats."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    captain = User.query.get(captain_id)
    
    if not captain:
        return jsonify({'error': 'Captain not found'}), 404
    
    if captain.role != 'captain':
        return jsonify({'error': 'User is not a captain'}), 400
    
    # Remove captain from their team
    if captain.captain_of:
        captain.captain_of.captain_id = None
        
    # Delete friendly posts created by this captain
    from app.models import FriendlyPost
    FriendlyPost.query.filter_by(captain_id=captain_id).delete(synchronize_session=False)
    
    # Delete notifications
    Notification.query.filter_by(user_id=captain_id).delete()
    
    # Clean up chat data
    from app.models import ChatMessage, ChatParticipant, ChatChannel
    
    # Get the user's direct chat channel IDs before deleting participations
    user_channels = [p.channel_id for p in ChatParticipant.query.filter_by(user_id=captain_id).all()]
    
    # Delete messages and participations  
    ChatMessage.query.filter_by(sender_id=captain_id).delete()
    ChatParticipant.query.filter_by(user_id=captain_id).delete()
    
    # Delete orphan direct chats (chats with no participants left)
    for channel_id in user_channels:
        channel = ChatChannel.query.get(channel_id)
        if channel and channel.type == 'direct':
            remaining = ChatParticipant.query.filter_by(channel_id=channel_id).count()
            if remaining <= 1:  # Only 1 or 0 participants left
                db.session.delete(channel)
    
    db.session.delete(captain)
    db.session.commit()
    
    return jsonify({'message': 'Captain deleted successfully'})


@admin.route('/admin/captains/<int:captain_id>/assign-team', methods=['POST'])
@login_required
def assign_captain_team(captain_id):
    """Assign or change the team for a captain."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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


# =====================================
# REFEREE ALLOCATION & COVERAGE
# =====================================

@admin.route('/admin/referee-coverage', methods=['POST'])
@login_required
def get_referee_coverage():
    """Get summary of game demand vs referee supply per slot."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
        
    # Get fixtures (demand)
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
        
    # Get availability (supply)
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
def allocate_games():
    """Trigger the allocation algorithm."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
    
    # Commit allocations first
    db.session.commit()
    
    # Ensure chats are created for allocated games
    from app.routes.chat import ensure_game_chat
    for alloc in allocations:
        fid = alloc.get('fixture_id')
        if fid:
            ensure_game_chat(fid)
    
    db.session.commit()  # Commit chat changes
    
    return jsonify({
        'message': f'Allocation complete. Assigned {len(allocations)} fixtures.',
        'allocations': allocations
    })


# =====================================
# PITCH MANAGEMENT
# =====================================

@admin.route('/admin/pitches', methods=['GET'])
@login_required
def get_pitches():
    """Get all pitches with availability."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
def create_pitch():
    """Create a new pitch."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
def delete_pitch(pitch_id):
    """Delete a pitch."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
def update_pitch_availability(pitch_id):
    """Add or update availability for a specific date."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
         
    # Clear existing availability for that date
    PitchAvailability.query.filter_by(pitch_id=pitch_id, date=date_obj)
    
    # Add new slots
    if slots:
        for slot in slots:
            pa = PitchAvailability(pitch_id=pitch_id, date=date_obj, time_slot=slot)
            db.session.add(pa)
            
    db.session.commit()
    
    return jsonify({'message': 'Availability updated'})


@admin.route('/admin/pitches/<int:pitch_id>/availability/bulk', methods=['POST'])
@login_required
def bulk_add_availability(pitch_id):
    """Add availability for multiple dates at once."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
def bulk_clear_availability():
    """Clear availability for a date range."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
def delete_availability_slot(pitch_id, slot_id):
    """Delete a specific availability slot."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    slot = PitchAvailability.query.filter_by(id=slot_id, pitch_id=pitch_id).first()
    if not slot:
        return jsonify({'error': 'Slot not found'}), 404
        
    db.session.delete(slot)
    db.session.commit()
    
    return jsonify({'message': 'Slot deleted'})


@admin.route('/admin/pitches/availability-summary', methods=['GET'])
@login_required
def get_availability_summary():
    """Get all pitch availability with booking status."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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


# =====================================
# LEAGUE & DIVISION MANAGEMENT
# =====================================

@admin.route('/admin/leagues', methods=['GET'])
@login_required
def get_leagues():
    """Get all leagues with divisions."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    leagues = League.query.all()
    result = []
    for l in leagues:
        l_dict = l.to_dict()
        l_dict['divisions'] = []
        for d in l.divisions:
            d_dict = d.to_dict()
            d_dict['teams'] = [td.team_id for td in d.teams]
            l_dict['divisions'].append(d_dict)
        result.append(l_dict)
        
    return jsonify({'leagues': result})


@admin.route('/admin/leagues', methods=['POST'])
@login_required
def create_league():
    """Create a new league."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
        
    league = League(
        name=name,
        default_day=data.get('day', 'Wednesday')
    )
    db.session.add(league)
    db.session.commit()
    
    l_dict = league.to_dict()
    l_dict['divisions'] = []
    
    return jsonify({'message': 'League created', 'league': l_dict})


@admin.route('/admin/leagues/<int:league_id>', methods=['DELETE'])
@login_required
def delete_league(league_id):
    """Delete a league and all associated items including game chats."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
    
    try:
        from app.models import ChatChannel
        
        for division in league.divisions:
            team_ids = [td.team_id for td in division.teams]
            if team_ids:
                fixtures = Fixture.query.filter(
                    (Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))
                ).all()
                if fixtures:
                    fixture_ids = [f.id for f in fixtures]
                    
                    # Delete game chats for these fixtures
                    ChatChannel.query.filter(
                        ChatChannel.fixture_id.in_(fixture_ids),
                        ChatChannel.type == 'game'
                    ).delete(synchronize_session=False)
                    
                    for f in fixtures:
                        if f.date and f.time_slot:
                            fixture_date = f.date.date() if hasattr(f.date, 'date') else f.date
                            RefereeAvailability.query.filter_by(
                                date=fixture_date,
                                time_slot=f.time_slot
                            ).delete(synchronize_session=False)
                    
                    Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

            # Delete TeamDivision associations
            from app.models import TeamDivision
            TeamDivision.query.filter_by(division_id=division.id).delete(synchronize_session=False)
            
            db.session.delete(division)
            
        db.session.delete(league)
        db.session.commit()
        return jsonify({'message': 'League and associated items deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting league: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@admin.route('/admin/leagues/<int:league_id>/divisions', methods=['POST'])
@login_required
def create_division(league_id):
    """Create a new division in a league."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
        
    day = data.get('day', league.default_day or 'Wednesday')
    
    div = Division(name=name, league_id=league_id, day_of_week=day)
    db.session.add(div)
    db.session.commit()
    
    d_dict = div.to_dict()
    d_dict['teams'] = []
    
    return jsonify({'message': 'Division created', 'division': d_dict})


@admin.route('/admin/divisions/<int:division_id>', methods=['DELETE'])
@login_required
def delete_division(division_id):
    """Delete a division."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404
        
    try:
        team_ids = [td.team_id for td in division.teams]
        if team_ids:
            fixtures = Fixture.query.filter(
                (Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))
            ).all()
            if fixtures:
                for f in fixtures:
                    if f.date and f.time_slot:
                        fixture_date = f.date.date() if hasattr(f.date, 'date') else f.date
                        RefereeAvailability.query.filter_by(
                            date=fixture_date,
                            time_slot=f.time_slot
                        ).delete(synchronize_session=False)
                
                fixture_ids = [f.id for f in fixtures]
                Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

        # Delete TeamDivision associations
        from app.models import TeamDivision
        TeamDivision.query.filter_by(division_id=division.id).delete(synchronize_session=False)
            
        db.session.delete(division)
        db.session.commit()
        return jsonify({'message': 'Division deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting division: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@admin.route('/admin/divisions/<int:division_id>/teams', methods=['POST'])
@login_required
def update_division_teams(division_id):
    """Update teams in a division."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    div = Division.query.get(division_id)
    if not div:
        return jsonify({'error': 'Division not found'}), 404
        
    data = request.get_json()
    team_ids = data.get('teamIdentifiers', [])
    
    from app.models import TeamDivision
    
    # Remove old assignments not in team_ids
    existing_tds = TeamDivision.query.filter_by(division_id=division_id).all()
    existing_team_ids = [td.team_id for td in existing_tds]
    
    for td in existing_tds:
        if td.team_id not in team_ids:
            db.session.delete(td)
            
    # Add new assignments
    for t_id in team_ids:
        if t_id not in existing_team_ids:
            team = Team.query.get(t_id)
            if team:
                new_td = TeamDivision(team_id=t_id, division_id=division_id)
                db.session.add(new_td)
                
    db.session.commit()
    
    return jsonify({'message': 'Teams assigned'})


@admin.route('/admin/divisions/<int:division_id>/fixtures', methods=['GET'])
@login_required
def get_division_fixtures(division_id):
    """Get all fixtures for a division."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404
    
    team_ids = [td.team_id for td in division.teams]
    
    if not team_ids:
        return jsonify({'fixtures': []})
    
    fixtures = Fixture.query.filter(
        (Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))
    ).order_by(Fixture.date.desc()).all()
    
    return jsonify({
        'fixtures': [f.to_dict() for f in fixtures],
        'division': division.to_dict()
    })


@admin.route('/admin/divisions/<int:division_id>/overview', methods=['GET'])
@login_required
def get_division_overview(division_id):
    """Get comprehensive division overview with standings and fixtures."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404
    
    teams = list(division.teams)
    team_ids = [td.team_id for td in teams]
    # Get TeamDivision records for stats
    from app.models import TeamDivision
    team_divisions = TeamDivision.query.filter_by(division_id=division_id).all()
    team_divisions_by_team = {td.team_id: td for td in team_divisions}
    
    sorted_teams = sorted(
        team_divisions, 
        key=lambda td: (td.points, td.goal_difference, td.goals_for), 
        reverse=True
    )
    
    standings = []
    for pos, td in enumerate(sorted_teams, 1):
        standings.append({
            'position': pos,
            'id': td.team.id,
            'name': td.team.name,
            'played': td.played,
            'won': td.won,
            'drawn': td.drawn,
            'lost': td.lost,
            'goals_for': td.goals_for,
            'goals_against': td.goals_against,
            'goal_difference': td.goal_difference,
            'points': td.points
        })
    
    if not team_ids:
        upcoming_fixtures = []
        past_fixtures = []
    else:
        now = datetime.now(timezone.utc)
        
        upcoming = Fixture.query.filter(
            ((Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))),
            Fixture.date >= now,
            Fixture.status.in_(['scheduled', 'postponed']),
            Fixture.tournament_id == None
        ).order_by(Fixture.date.asc()).all()
        
        past = Fixture.query.filter(
            ((Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))),
            (Fixture.date < now) | (Fixture.status == 'completed'),
            Fixture.tournament_id == None
        ).order_by(Fixture.date.desc()).all()
        
        upcoming_fixtures = []
        for f in upcoming:
            f_dict = f.to_dict()
            f_dict['ref_id'] = f.ref_id
            f_dict['has_referee'] = f.ref_id is not None
            upcoming_fixtures.append(f_dict)
        
        past_fixtures = []
        for f in past:
            f_dict = f.to_dict()
            f_dict['ref_id'] = f.ref_id
            past_fixtures.append(f_dict)
    
    return jsonify({
        'division': division.to_dict(),
        'standings': standings,
        'upcoming_fixtures': upcoming_fixtures,
        'past_fixtures': past_fixtures
    })


# =====================================
# TEAM MANAGEMENT
# =====================================

@admin.route('/admin/teams', methods=['GET'])
@login_required
def get_all_teams():
    """Get all teams."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    teams = Team.query.all()
    return jsonify({'teams': [t.to_dict() for t in teams]})


@admin.route('/admin/teams', methods=['POST'])
@login_required
def create_team():
    """Create a new team."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
def delete_team(team_id):
    """Delete a team."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    
    try:
        from app.models import PostponementRequest, FriendlyPost
        
        # Delete any friendly posts by this team
        FriendlyPost.query.filter_by(team_id=team_id).delete(synchronize_session=False)
        
        Player.query.filter_by(team_id=team_id).delete(synchronize_session='fetch')
        
        fixtures_to_delete = Fixture.query.filter(
            (Fixture.home_team_id == team_id) | (Fixture.away_team_id == team_id)
        ).all()
        
        if fixtures_to_delete:
            fixture_ids = [f.id for f in fixtures_to_delete]
            # Delete postponement requests for these fixtures first
            PostponementRequest.query.filter(
                PostponementRequest.fixture_id.in_(fixture_ids)
            ).delete(synchronize_session=False)
            Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)
        
        # Also delete any remaining postponement requests by this team
        PostponementRequest.query.filter_by(requester_team_id=team_id).delete(synchronize_session='fetch')
        
        db.session.delete(team)
        db.session.commit()
        
        return jsonify({'message': 'Team deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting team: {e}")
        return jsonify({'error': 'Internal server error'}), 500


# =====================================
# FIXTURE MANAGEMENT
# =====================================

@admin.route('/admin/fixtures', methods=['POST'])
@login_required
def create_fixture():
    """Create a new fixture."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
def update_fixture(fixture_id):
    """Update a fixture and notify affected users of changes."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    fixture = Fixture.query.get(fixture_id)
    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404
        
    data = request.get_json()
    
    # Track changes for notifications
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
    
    # Create notifications for game alterations
    if changes:
        game_name = f"{fixture.home_team.name} vs {fixture.away_team.name}"
        recipients = []
        
        # Add referee if assigned
        if fixture.ref_id:
            recipients.append(fixture.ref_id)
        
        # Add captains
        if fixture.home_team.captain_id:
            recipients.append(fixture.home_team.captain_id)
        if fixture.away_team.captain_id:
            recipients.append(fixture.away_team.captain_id)
        
        # Determine notification type and message
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
            
            # Send to all recipients
            for user_id in recipients:
                db.session.add(Notification(
                    user_id=user_id,
                    title=title,
                    message=message,
                    type=notif_type
                ))
    
    db.session.commit()
    return jsonify({'message': 'Fixture updated', 'fixture': fixture.to_dict()})


@admin.route('/admin/fixtures/<int:fixture_id>', methods=['DELETE'])
@login_required
def delete_fixture(fixture_id):
    """Delete a fixture and its associated chat."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    fixture = Fixture.query.get(fixture_id)

    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404
    
    # Delete associated game chat
    from app.models import ChatChannel
    chat = ChatChannel.query.filter_by(fixture_id=fixture_id, type='game').first()
    if chat:
        db.session.delete(chat)  # Cascade deletes participants and messages
        
    db.session.delete(fixture)
    db.session.commit()
    return jsonify({'message': 'Fixture deleted'})


@admin.route('/admin/fixtures/cancel-day', methods=['POST'])
@login_required
def cancel_fixtures_by_day():
    """Cancel all fixtures on a specific day."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
def emergency_cancel_day():
    """Emergency cancel with notifications."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
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
        
        # Notify ref
        if f.ref_id:
            db.session.add(Notification(
                user_id=f.ref_id,
                title="Fixture Cancelled (Emergency)",
                message=f"Game {f.home_team.name} vs {f.away_team.name} on {date_str} cancelled: {reason_id}. {message}",
                type='urgent'
            ))
            
        # Notify captains
        caps = []
        if f.home_team.captain_id:
            caps.append(f.home_team.captain_id)
        if f.away_team.captain_id:
            caps.append(f.away_team.captain_id)
        
        for cap_id in caps:
            opponent = f.away_team.name if f.home_team.captain_id == cap_id else f.home_team.name
            db.session.add(Notification(
                user_id=cap_id,
                title="Fixture Cancelled (Emergency)",
                message=f"Game vs {opponent} cancelled: {reason_id}. {message}",
                type='urgent'
            ))
            
    db.session.commit()
    return jsonify({'message': f'Cancelled {count} games', 'count': count})


# =====================================
# AVAILABILITY WINDOW SETTINGS
# =====================================

@admin.route('/admin/availability-window', methods=['GET', 'POST'])
@login_required
def manage_availability_window():
    """Get or set the referee availability window."""
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
        
    # POST
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


@admin.route('/admin/fixtures/<int:fixture_id>/reschedule', methods=['POST'])
@login_required
def reschedule_fixture(fixture_id):
    """Reschedule a postponed fixture to a new date/time/pitch."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    fixture = Fixture.query.get_or_404(fixture_id)
    
    if fixture.status != 'postponed':
        return jsonify({'error': 'Only postponed fixtures can be rescheduled'}), 400
    
    data = request.get_json()
    new_date = data.get('date')
    new_time = data.get('time_slot')
    new_pitch = data.get('pitch')
    
    if not new_date or not new_time or not new_pitch:
        return jsonify({'error': 'Date, time_slot, and pitch are required'}), 400
    
    # Update fixture
    fixture.date = datetime.strptime(new_date, '%Y-%m-%d')
    fixture.time_slot = new_time
    fixture.pitch = new_pitch
    fixture.status = 'scheduled'
    
    # Notify captains
    teams = [fixture.home_team, fixture.away_team]
    for t in teams:
        if t.captain_id:
            opponent = fixture.away_team.name if t.id == fixture.home_team_id else fixture.home_team.name
            db.session.add(Notification(
                user_id=t.captain_id,
                title="Match Rescheduled",
                message=f"Your match vs {opponent} has been rescheduled to {new_date} at {new_time} ({new_pitch}).",
                type='info'
            ))
    
    # Notify referee if assigned
    if fixture.ref_id:
        db.session.add(Notification(
            user_id=fixture.ref_id,
            title="Match Rescheduled",
            message=f"Match {fixture.home_team.name} vs {fixture.away_team.name} rescheduled to {new_date} at {new_time} ({new_pitch}).",
            type='info'
        ))
    
    db.session.commit()
    return jsonify({'message': 'Fixture rescheduled successfully', 'fixture': fixture.to_dict()})


# =====================================
# DATA RESET
# =====================================

@admin.route('/admin/reset-data', methods=['POST'])
@login_required
def reset_all_data():
    """Wipe all data except the current admin account."""
    import os
    if os.environ.get('FLASK_ENV') == 'production':
        return jsonify({'error': 'Data reset is disabled in production'}), 403
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import (
        ChatMessage, ChatParticipant, ChatChannel,
        PostponementRequest, Notification, FriendlyPost,
        RefereeAvailability, PitchAvailability, Pitch,
        Player, Fixture, Team, Division, League, SystemSetting
    )
    
    try:
        # Order matters: delete dependents first
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
        Fixture.query.delete()
        Team.query.delete()
        Division.query.delete()
        League.query.delete()
        SystemSetting.query.delete()
        
        # Delete all non-admin users
        User.query.filter(User.id != current_user.id).delete()
        
        db.session.commit()
        return jsonify({'message': 'All data has been reset. Only your admin account remains.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Reset failed: {str(e)}'}), 500


# ──────────────────────────────────────────────────────────────────────────────
#  TOURNAMENT CRUD
# ──────────────────────────────────────────────────────────────────────────────

@admin.route('/admin/tournaments', methods=['GET'])
@login_required
def list_tournaments():
    """List all tournaments with their teams and fixtures."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    tournaments = Tournament.query.order_by(Tournament.created_at.desc()).all()
    result = []
    for t in tournaments:
        team_ids = db.session.execute(
            tournament_teams.select().where(tournament_teams.c.tournament_id == t.id)
        ).fetchall()
        teams = []
        for row in team_ids:
            team = Team.query.get(row.team_id)
            if team:
                teams.append({'id': team.id, 'name': team.name})

        fixtures = [f.to_dict() for f in t.fixtures.order_by(Fixture.match_order).all()]

        # Group fixtures by round
        rounds = {}
        for f in fixtures:
            rn = f.get('round_name', 'Unknown')
            if rn not in rounds:
                rounds[rn] = []
            rounds[rn].append(f)

        result.append({
            **t.to_dict(),
            'teams': teams,
            'fixtures': fixtures,
            'rounds': rounds
        })

    return jsonify({'tournaments': result})


@admin.route('/admin/tournaments', methods=['POST'])
@login_required
def create_tournament():
    """Create a new tournament."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Tournament name is required'}), 400

    tournament = Tournament(name=name, format='knockout', status='setup')
    db.session.add(tournament)
    db.session.commit()

    return jsonify({'message': f'Tournament "{name}" created', 'tournament': tournament.to_dict()}), 201


@admin.route('/admin/tournaments/<int:tid>/teams', methods=['POST'])
@login_required
def assign_tournament_teams(tid):
    """Assign teams to a tournament."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    tournament = Tournament.query.get_or_404(tid)
    data = request.get_json()
    team_ids = data.get('teamIds', [])

    if len(team_ids) < 2:
        return jsonify({'error': 'At least 2 teams required'}), 400

    # Clear existing
    db.session.execute(tournament_teams.delete().where(tournament_teams.c.tournament_id == tid))

    for team_id in team_ids:
        db.session.execute(tournament_teams.insert().values(tournament_id=tid, team_id=int(team_id)))

    db.session.commit()
    return jsonify({'message': f'{len(team_ids)} teams assigned'})


@admin.route('/admin/tournaments/<int:tid>/generate', methods=['POST'])
@login_required
def generate_knockout_bracket(tid):
    """Generate knockout bracket fixtures with bye support."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    tournament = Tournament.query.get_or_404(tid)

    data = request.get_json()
    start_date_str = data.get('startDate')
    # Default time slot if no slots are available
    default_time_slot = data.get('timeSlot', '15:00')
    bye_team_ids = data.get('byeTeamIds', [])  # Teams that get a first-round bye

    if not start_date_str:
        return jsonify({'error': 'Start date is required'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    # Get participating teams
    rows = db.session.execute(
        tournament_teams.select().where(tournament_teams.c.tournament_id == tid)
    ).fetchall()
    all_team_ids = [r.team_id for r in rows]

    if len(all_team_ids) < 2:
        return jsonify({'error': 'At least 2 teams must be assigned'}), 400

    # Delete existing tournament fixtures
    Fixture.query.filter_by(tournament_id=tid).delete()

    # Separate bye teams and playing teams
    bye_ids_set = set(int(b) for b in bye_team_ids)
    playing = [t_id for t_id in all_team_ids if t_id not in bye_ids_set]
    byes = [t_id for t_id in all_team_ids if t_id in bye_ids_set]

    # Determine round names based on total teams (playing + byes advancing)
    total = len(all_team_ids)
    round_names = []
    if total <= 2:
        round_names = ['Final']
    elif total <= 4:
        round_names = ['Semi-Final', 'Final']
    elif total <= 8:
        round_names = ['Quarter-Final', 'Semi-Final', 'Final']
    elif total <= 16:
        round_names = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
    else:
        round_names = ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']

    # Pitch allocation
    from app.models import PitchAvailability, Pitch
    import random
    from datetime import timedelta

    # Generate Round 1 matches (non-bye teams paired up)
    fixtures_created = []
    match_order = 1
    current_date = start_date

    # Pre-calculate pairs
    pairs = []
    for i in range(0, len(playing) - 1, 2):
        pairs.append((playing[i], playing[i + 1]))

    pair_idx = 0
    weeks_checked = 0

    while pair_idx < len(pairs):
        all_slots = PitchAvailability.query.filter_by(date=current_date.date()).all()
        
        # Filter out slots taken by existing fixtures
        existing_fixtures = Fixture.query.filter(
            Fixture.date == current_date,
            Fixture.status != 'cancelled'
        ).all()
        
        busy = set()
        for ef in existing_fixtures:
            if ef.pitch and ef.time_slot:
                busy.add((ef.pitch, ef.time_slot))
                
        valid_slots = []
        for slot in all_slots:
            pitch = Pitch.query.get(slot.pitch_id)
            if pitch and (pitch.name, slot.time_slot) not in busy:
                valid_slots.append({'pitch': pitch, 'time': slot.time_slot})
                
        # If no valid slots on this date, fallback or move to next week
        if len(valid_slots) == 0:
            if weeks_checked > 10:
                # Force assign remaining as Unassigned
                for i in range(pair_idx, len(pairs)):
                    home, away = pairs[i]
                    fixture = Fixture(
                        home_team_id=home,
                        away_team_id=away,
                        tournament_id=tid,
                        round_name=round_names[0],
                        match_order=match_order,
                        date=current_date,
                        time_slot=default_time_slot,
                        pitch="Unassigned (No more slots)",
                        status='scheduled'
                    )
                    db.session.add(fixture)
                    fixtures_created.append(fixture)
                    match_order += 1
                break
            else:
                current_date += timedelta(weeks=1)
                weeks_checked += 1
                continue
                
        random.shuffle(valid_slots)
        
        # Assign available slots
        for slot in valid_slots:
            if pair_idx >= len(pairs):
                break
                
            home, away = pairs[pair_idx]
            fixture = Fixture(
                home_team_id=home,
                away_team_id=away,
                tournament_id=tid,
                round_name=round_names[0],
                match_order=match_order,
                date=current_date,
                time_slot=slot['time'],
                pitch=slot['pitch'].name,
                status='scheduled'
            )
            db.session.add(fixture)
            fixtures_created.append(fixture)
            match_order += 1
            pair_idx += 1
            
        # Move to next week for remaining matches
        if pair_idx < len(pairs):
            current_date += timedelta(weeks=1)
            weeks_checked += 1

    # If odd number of playing teams, last team gets a bye via a "BYE" marker
    if len(playing) % 2 == 1:
        byes.append(playing[-1])

    tournament.status = 'in_progress'
    db.session.commit()

    return jsonify({
        'message': f'Knockout bracket generated: {len(fixtures_created)} matches in {round_names[0]}',
        'fixtures': [f.to_dict() for f in fixtures_created],
        'bye_teams': [Team.query.get(b).name for b in byes if Team.query.get(b)],
        'rounds': round_names
    })


@admin.route('/admin/tournaments/<int:tid>/advance', methods=['POST'])
@login_required
def advance_tournament_round(tid):
    """Advance completed round winners to the next round."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    tournament = Tournament.query.get_or_404(tid)
    data = request.get_json()
    next_round_name = data.get('nextRound')
    next_date_str = data.get('date')
    default_time_slot = data.get('timeSlot', '15:00')

    if not next_round_name or not next_date_str:
        return jsonify({'error': 'Next round name and date required'}), 400

    try:
        next_date = datetime.strptime(next_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    # Get the current round's completed fixtures
    current_fixtures = Fixture.query.filter_by(
        tournament_id=tid, status='completed'
    ).order_by(Fixture.match_order).all()

    # Get all existing rounds
    existing_rounds = set()
    for f in tournament.fixtures.all():
        if f.round_name:
            existing_rounds.add(f.round_name)

    # Check if next_round already has fixtures
    existing_next = Fixture.query.filter_by(tournament_id=tid, round_name=next_round_name).count()
    if existing_next > 0:
        return jsonify({'error': f'{next_round_name} fixtures already exist'}), 400

    # Determine winners
    winners = []
    for f in current_fixtures:
        if f.round_name not in existing_rounds:
            continue
        if f.home_score is not None and f.away_score is not None:
            if f.home_score > f.away_score:
                winners.append(f.home_team_id)
            elif f.away_score > f.home_score:
                winners.append(f.away_team_id)
            # Draw/tie — shouldn't happen in knockout, skip

    # Also add bye teams that were stored
    bye_team_ids = data.get('byeTeamIds', [])
    for b in bye_team_ids:
        winners.append(int(b))

    if len(winners) < 2:
        return jsonify({'error': 'Not enough winners to create next round'}), 400

    # Pitch allocation
    from app.models import PitchAvailability, Pitch
    import random
    from datetime import timedelta
    
    fixtures_created = []
    match_order = 1
    current_date = next_date

    pairs = []
    for i in range(0, len(winners) - 1, 2):
        pairs.append((winners[i], winners[i + 1]))

    pair_idx = 0
    weeks_checked = 0

    while pair_idx < len(pairs):
        all_slots = PitchAvailability.query.filter_by(date=current_date.date()).all()
        
        # Filter out slots taken by existing fixtures
        existing_fixtures = Fixture.query.filter(
            Fixture.date == current_date,
            Fixture.status != 'cancelled'
        ).all()
        
        busy = set()
        for ef in existing_fixtures:
            if ef.pitch and ef.time_slot:
                busy.add((ef.pitch, ef.time_slot))
                
        valid_slots = []
        for slot in all_slots:
            pitch = Pitch.query.get(slot.pitch_id)
            if pitch and (pitch.name, slot.time_slot) not in busy:
                valid_slots.append({'pitch': pitch, 'time': slot.time_slot})
                
        if len(valid_slots) == 0:
            if weeks_checked > 10:
                # Force assign remaining
                for i in range(pair_idx, len(pairs)):
                    home, away = pairs[i]
                    fixture = Fixture(
                        home_team_id=home,
                        away_team_id=away,
                        tournament_id=tid,
                        round_name=next_round_name,
                        match_order=match_order,
                        date=current_date,
                        time_slot=default_time_slot,
                        pitch="Unassigned (No more slots)",
                        status='scheduled'
                    )
                    db.session.add(fixture)
                    fixtures_created.append(fixture)
                    match_order += 1
                break
            else:
                current_date += timedelta(weeks=1)
                weeks_checked += 1
                continue
                
        random.shuffle(valid_slots)
        
        for slot in valid_slots:
            if pair_idx >= len(pairs):
                break
                
            home, away = pairs[pair_idx]
            fixture = Fixture(
                home_team_id=home,
                away_team_id=away,
                tournament_id=tid,
                round_name=next_round_name,
                match_order=match_order,
                date=current_date,
                time_slot=slot['time'],
                pitch=slot['pitch'].name,
                status='scheduled'
            )
            db.session.add(fixture)
            fixtures_created.append(fixture)
            match_order += 1
            pair_idx += 1
            
        if pair_idx < len(pairs):
            current_date += timedelta(weeks=1)
            weeks_checked += 1

    # If this is the Final round with 1 fixture, mark tournament
    if next_round_name == 'Final' and len(fixtures_created) == 1:
        pass  # Will mark completed after final is played

    db.session.commit()
    return jsonify({
        'message': f'{len(fixtures_created)} matches created for {next_round_name}',
        'fixtures': [f.to_dict() for f in fixtures_created]
    })


@admin.route('/admin/tournaments/<int:tid>', methods=['DELETE'])
@login_required
def delete_tournament(tid):
    """Delete a tournament and all its fixtures."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    tournament = Tournament.query.get_or_404(tid)

    # Delete fixtures
    Fixture.query.filter_by(tournament_id=tid).delete()
    # Delete team assignments
    db.session.execute(tournament_teams.delete().where(tournament_teams.c.tournament_id == tid))
    # Delete tournament
    db.session.delete(tournament)
    db.session.commit()

    return jsonify({'message': f'Tournament "{tournament.name}" deleted'})
