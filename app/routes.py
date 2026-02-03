from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.models import Fixture, Team, Division, RefereeAvailability, League, player, SystemSetting, Notification, PostponementRequest, ChatChannel, ChatParticipant, ChatMessage
from app import db
from datetime import datetime
from sqlalchemy import func

main = Blueprint('main', __name__)

@main.route('/health')
def health_check():
    return jsonify({'status': 'ok', 'message': 'League API is running'})

@main.route('/fixtures', methods=['GET'])
@login_required
def get_fixtures():
    # If captain, show their team's fixtures
    if current_user.role == 'captain':
        team = current_user.captain_of
        if not team:
            return jsonify({'fixtures': []})
        
        # Get home and away matches
        fixtures = Fixture.query.filter(
            (Fixture.home_team_id == team.id) | (Fixture.away_team_id == team.id)
        ).order_by(Fixture.date).all()
        
        return jsonify({'fixtures': [f.to_dict() for f in fixtures]})
    
    # If ref or admin, show all (or filter by query params)
    fixtures = Fixture.query.order_by(Fixture.date).all()
    
    # Add interest info (Legacy: No longer tracking specific game interest counts)
    result = [f.to_dict() for f in fixtures]
        
    return jsonify({'fixtures': result})

@main.route('/leagues/<int:league_id>/generate-fixtures', methods=['POST'])
@login_required
def generate_league_fixtures(league_id):
    """Generate fixtures for an entire league using global pitch allocation."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
    data = request.get_json()
    start_str = data.get('date')
    
    if not start_str:
        return jsonify({'error': 'Start date required'}), 400
        
    try:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
        
    # Delete existing FUTURE scheduled fixtures for this league to avoid duplicates/mess
    # (Optional safety, or assume user handled cleanup? Current per-div flow didn't seem to force cleanup)
    # Let's clean up future SCHEDULED fixtures for all divisions in this league.
    div_ids = [d.id for d in league.divisions]
    cleanup_count = 0
    if div_ids:
         fixtures_to_delete = Fixture.query.join(Team, Fixture.home_team_id == Team.id)\
            .filter(
                Team.division_id.in_(div_ids),
                Fixture.status == 'scheduled',
                Fixture.date >= start_date
            ).all()
            
         for f in fixtures_to_delete:
             db.session.delete(f)
         cleanup_count = len(fixtures_to_delete)
         
    from app.utils.scheduler import LeagueRoundRobinScheduler
    scheduler = LeagueRoundRobinScheduler(league, start_date)
    fixtures = scheduler.generate_fixtures()
    
    for f in fixtures:
        db.session.add(f)
        
    db.session.commit()
    
    return jsonify({
        'message': f'Generated week-by-week schedule: {len(fixtures)} fixtures across {league.divisions.count()} divisions.',
        'cleanup_count': cleanup_count,
        'fixtures': [f.to_dict() for f in fixtures]
    })


@main.route('/fixtures/generate', methods=['POST'])
@login_required
def generate_fixtures():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    division_id = data.get('divisionId')
    start_date_str = data.get('date')
    games_per_week = data.get('gamesPerWeek')  # None or 0 = all games
    
    if not division_id or not start_date_str:
        return jsonify({'error': 'Missing divisionId or date'}), 400
        
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    # Look up division by ID - handle both string and int IDs
    try:
        div_id = int(division_id) if isinstance(division_id, str) else division_id
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid division ID'}), 400
        
    division = Division.query.get(div_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404

    from app.utils.scheduler import RoundRobinScheduler
    
    # Pass games_per_week to scheduler (convert 0 or null to None for "all")
    gpw = None
    if games_per_week and int(games_per_week) > 0:
        gpw = int(games_per_week)
    
    scheduler = RoundRobinScheduler(division, start_date, games_per_week=gpw)
    fixtures = scheduler.generate_fixtures()
    
    for f in fixtures:
        db.session.add(f)
    
    db.session.commit()
    
    return jsonify({'message': f'Generated {len(fixtures)} fixtures', 'count': len(fixtures)})

@main.route('/fixtures/available', methods=['GET'])
@login_required
def get_available_fixtures():
    """Get available TIME SLOTS for referees to sign up, filtered by Admin Window."""
    if current_user.role != 'referee':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # 1. Get Window Settings
    w_start = SystemSetting.query.get('ref_window_start')
    w_end = SystemSetting.query.get('ref_window_end')
    w_open = SystemSetting.query.get('ref_window_open')
    
    # If window is closed, technically we should return empty or error?
    # But frontend handles "Closed" UI. We just return data.
    # User asked to "only see the period... set the allocation period for".
    
    query = Fixture.query.filter(Fixture.ref_id == None, Fixture.status == 'scheduled')
    
    # Filter by Window Date Range
    if w_start and w_start.value:
         try:
            s_date = datetime.strptime(w_start.value, '%Y-%m-%d').date()
            query = query.filter(Fixture.date >= s_date)
         except ValueError: pass
    else:
         # Fallback: All future games
         query = query.filter(Fixture.date >= datetime.now().date())

    if w_end and w_end.value:
         try:
            e_date = datetime.strptime(w_end.value, '%Y-%m-%d').date()
            query = query.filter(Fixture.date <= e_date)
            # Add one day to include end date matches fully if times clash? 
            # Date comparison usually compares at 00:00. 
            # If Fixture.date is datetime, >= date works (00:00). 
            # <= date works (00:00). So games on end_date at 14:00 are > end_date (00:00).
            # We should use < end_date + 1 day
            # Actually, standard SQLAlchemy/DB behavior varies.
            # Safest: Cast or use end of day.
            # Let's assume Fixture.date includes time.
            # So <= end_date (which is date object) acts like midnight.
            # Effectively excludes the day.
            # Let's use < (e_date + 1 day)
            from datetime import timedelta
            query = query.filter(Fixture.date < (e_date + timedelta(days=1)))
         except ValueError: pass

    fixtures = query.order_by(Fixture.date, Fixture.time_slot).all()
    
    # Group by (date, time)
    slots_map = {}
    for f in fixtures:
        if not f.date or not f.time_slot: continue
        
        # Use ISO date str as key
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

    # 2. Get Ref Counts (Supply)
    # Aggregate counts of available refs per slot
    ref_counts = db.session.query(
        RefereeAvailability.date, 
        RefereeAvailability.time_slot, 
        func.count(RefereeAvailability.id)
    ).group_by(RefereeAvailability.date, RefereeAvailability.time_slot).all()
    
    ref_counts_map = {}
    for r_date, r_time, count in ref_counts:
        ref_counts_map[(r_date.isoformat(), r_time)] = count
        
    # Inject Counts
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
             # Determine if "total_ref_count" includes ALL refs or OTHER refs?
             # User requested: "how many OTHER refs have expressed interest".
             # If I am included in DB count, subtract 1.
             if slots_map[key]['total_ref_count'] > 0:
                 slots_map[key]['total_ref_count'] -= 1

    # Convert to list
    result = list(slots_map.values())
    result.sort(key=lambda x: (x['date'], x['time']))
    
    return jsonify({'slots': result})

@main.route('/referee/availability', methods=['POST'])
@login_required
def add_availability():
    """Allow a referee to express availability for a slot."""
    if current_user.role != 'referee':
        return jsonify({'error': 'Unauthorized'}), 403
    
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
        
    avail = RefereeAvailability(user_id=current_user.id, date=date_obj, time_slot=time_slot)
    db.session.add(avail)
    db.session.commit()
    
    return jsonify({'message': f'Marked available for {date_str} at {time_slot}'})

@main.route('/referee/availability', methods=['DELETE'])
@login_required
def remove_availability():
    """Allow a referee to withdraw availability."""
    if current_user.role != 'referee':
        return jsonify({'error': 'Unauthorized'}), 403
    
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

@main.route('/referee/my-games', methods=['GET'])
@login_required
def get_my_games():
    """Get all fixtures the current referee is assigned to, AND open games available for pickup."""
    if current_user.role != 'referee':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # 1. Assigned games
    assigned = Fixture.query.filter(
        Fixture.ref_id == current_user.id
    ).order_by(Fixture.date).all()
    
    # 2. Open Games (Available for Pickup)
    # Games that are scheduled, in the future, and have NO referee
    open_games = Fixture.query.filter(
        Fixture.ref_id == None,
        Fixture.status == 'scheduled',
        Fixture.date >= datetime.now().date()
    ).order_by(Fixture.date).all()
    
    return jsonify({
        'assigned': [f.to_dict() for f in assigned],
        'open': [f.to_dict() for f in open_games]
    })

@main.route('/api/referee/games/<int:game_id>/dropout', methods=['POST'])
@login_required
def dropout_game(game_id):
    """Ref drops out of a game. Notifications sent to everyone."""
    if current_user.role != 'referee':
        return jsonify({'error': 'Unauthorized'}), 403
    
    fixture = Fixture.query.get(game_id)
    if not fixture:
        return jsonify({'error': 'Game not found'}), 404
        
    if fixture.ref_id != current_user.id:
        return jsonify({'error': 'You are not assigned to this game'}), 400
        
    # Unassign
    fixture.ref_id = None
    db.session.add(fixture)
    
    # 1. Notify Admin
    from app.models import User
    admin = User.query.filter_by(role='admin').first()
    if admin:
        admin_notif = Notification(
            user_id=admin.id,
            title="Referee Usage Alert: Dropout",
            message=f"Referee {current_user.name} dropped out of {fixture.home_team.name} vs {fixture.away_team.name} on {fixture.date.strftime('%Y-%m-%d')}.",
            type='urgent'
        )
        db.session.add(admin_notif)
        
    # 2. Notify Captains
    home_team = fixture.home_team
    away_team = fixture.away_team
    
    if home_team.captain_id:
        home_notif = Notification(
            user_id=home_team.captain_id,
            title="Referee Update",
            message=f"The referee for your game vs {away_team.name} has dropped out. We are looking for a replacement.",
            type='urgent'
        )
        db.session.add(home_notif)
        
    if away_team.captain_id:
        away_notif = Notification(
            user_id=away_team.captain_id,
            title="Referee Update",
            message=f"The referee for your game vs {home_team.name} has dropped out. We are looking for a replacement.",
            type='urgent'
        )
        db.session.add(away_notif)
        
    # 3. Notify ALL Other Referees
    other_refs = User.query.filter(User.role == 'referee', User.id != current_user.id).all()
    for ref in other_refs:
        ref_notif = Notification(
            user_id=ref.id,
            title="Urgent Coverage Needed",
            message=f"A game has become available! {fixture.home_team.name} vs {fixture.away_team.name} on {fixture.date.strftime('%Y-%m-%d %H:%M')}. First to claim gets it.",
            type='info'
        )
        db.session.add(ref_notif)
        
    # Chat Cleanup: Remove Ref from Chat
    chat = ChatChannel.query.filter_by(fixture_id=fixture.id, type='game').first()
    if chat:
        part = ChatParticipant.query.filter_by(user_id=current_user.id, channel_id=chat.id).first()
        if part:
            db.session.delete(part)
            # System message
            db.session.add(ChatMessage(
                 channel_id=chat.id, 
                 sender_id=current_user.id, 
                 content="Referee has left the chat (dropped out)."
            ))
        
    db.session.commit()
    
    return jsonify({'message': 'Successfully dropped out. Relevance parties notified.'})

@main.route('/api/referee/games/<int:game_id>/pickup', methods=['POST'])
@login_required
def pickup_game(game_id):
    """Ref picks up an open game (First Come First Served)."""
    if current_user.role != 'referee':
        return jsonify({'error': 'Unauthorized'}), 403
        
    fixture = Fixture.query.get(game_id)
    if not fixture:
        return jsonify({'error': 'Game not found'}), 404
        
    if fixture.ref_id is not None:
        return jsonify({'error': 'This game has already been taken by another referee.'}), 400
        
    # Assign to current user
    fixture.ref_id = current_user.id
    db.session.add(fixture)
    
    # 1. Notify Admin
    from app.models import User
    admin = User.query.filter_by(role='admin').first()
    if admin:
        admin_notif = Notification(
            user_id=admin.id,
            title="Referee Coverage Found",
            message=f"Referee {current_user.name} picked up {fixture.home_team.name} vs {fixture.away_team.name}.",
            type='success'
        )
        db.session.add(admin_notif)
        
    # 2. Notify Captains
    home_team = fixture.home_team
    away_team = fixture.away_team
    
    if home_team.captain_id:
        home_notif = Notification(
            user_id=home_team.captain_id,
            title="Referee Assigned",
            message=f"A new referee ({current_user.name}) has been assigned to your game vs {away_team.name}.",
            type='success'
        )
        db.session.add(home_notif)
        
    if away_team.captain_id:
        away_notif = Notification(
            user_id=away_team.captain_id,
            title="Referee Assigned",
            message=f"A new referee ({current_user.name}) has been assigned to your game vs {home_team.name}.",
            type='success'
        )
        db.session.add(away_notif)
        
    # Ensure Chat Created and Ref Added
    ensure_game_chat(fixture)
        
    db.session.commit()
    
    return jsonify({'message': 'Game successfully claimed!'})

# =====================================
# ADMIN REFEREE MANAGEMENT
# =====================================

@main.route('/admin/referees', methods=['GET'])
@login_required
def get_all_referees():
    """Get all referee accounts with detailed stats."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import User
    referees = User.query.filter_by(role='referee').all()
    
    referee_list = []
    for r in referees:
        # Games reffed (completed)
        games_completed = r.reffed_games.filter_by(status='completed').count()
        # Total games assigned (all statuses)
        games_assigned = r.reffed_games.count()
        # Number of availability submissions
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

@main.route('/admin/referees', methods=['POST'])
@login_required
def create_referee():
    """Create a new referee account."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import User
    data = request.get_json()
    
    username = data.get('username')
    name = data.get('name')
    phone = data.get('phone', '')
    password = data.get('password', 'referee123')  # Default password if not provided
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    # Check if username already exists
    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Create the referee account
    referee = User(
        username=username,
        name=name or username,
        phone=phone,
        role='referee'
    )
    referee.set_password(password)
    
    db.session.add(referee)
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

@main.route('/admin/referees/<int:referee_id>', methods=['DELETE'])
@login_required
def delete_referee(referee_id):
    """Delete a referee account."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import User
    referee = User.query.get(referee_id)
    
    if not referee:
        return jsonify({'error': 'Referee not found'}), 404
    
    if referee.role != 'referee':
        return jsonify({'error': 'User is not a referee'}), 400
    
    # Unassign referee from any fixtures
    for fixture in referee.reffed_games:
        fixture.ref_id = None
    
    # Delete referee availability records
    RefereeAvailability.query.filter_by(user_id=referee_id).delete()
    
    db.session.delete(referee)
    db.session.commit()
    
    return jsonify({'message': 'Referee deleted successfully'})

# =====================================
# ADMIN CAPTAIN MANAGEMENT
# =====================================

@main.route('/admin/captains', methods=['GET'])
@login_required
def get_all_captains():
    """Get all captain accounts with team info."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import User
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

@main.route('/admin/captains', methods=['POST'])
@login_required
def create_captain():
    """Create a new captain account and optionally link to a team."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import User
    data = request.get_json()
    
    username = data.get('username')
    name = data.get('name')
    phone = data.get('phone', '')
    password = data.get('password', 'captain123')  # Default password if not provided
    team_id = data.get('team_id')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    # Check if username already exists
    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Validate team_id if provided
    team = None
    if team_id:
        team = Team.query.get(team_id)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
        # Check if team already has a captain
        if team.captain_id:
            existing_captain = User.query.get(team.captain_id)
            if existing_captain:
                return jsonify({'error': f'Team already has captain: {existing_captain.username}'}), 400
    
    # Create the captain account
    captain = User(
        username=username,
        name=name or username,
        phone=phone,
        role='captain'
    )
    captain.set_password(password)
    
    db.session.add(captain)
    db.session.flush()  # Get captain.id before commit
    
    # Link team to captain
    if team:
        team.captain_id = captain.id
    
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

@main.route('/admin/captains/<int:captain_id>', methods=['DELETE'])
@login_required
def delete_captain(captain_id):
    """Delete a captain account."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import User
    captain = User.query.get(captain_id)
    
    if not captain:
        return jsonify({'error': 'Captain not found'}), 404
    
    if captain.role != 'captain':
        return jsonify({'error': 'User is not a captain'}), 400
    
    # Unlink captain from any team
    if captain.captain_of:
        captain.captain_of.captain_id = None
    
    db.session.delete(captain)
    db.session.commit()
    
    return jsonify({'message': 'Captain deleted successfully'})

@main.route('/admin/captains/<int:captain_id>/assign-team', methods=['POST'])
@login_required
def assign_captain_team(captain_id):
    """Assign or change the team for a captain."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from app.models import User
    captain = User.query.get(captain_id)
    
    if not captain or captain.role != 'captain':
        return jsonify({'error': 'Captain not found'}), 404
    
    data = request.get_json()
    team_id = data.get('team_id')
    
    # Unlink old team if exists
    if captain.captain_of:
        captain.captain_of.captain_id = None
    
    # Link new team if provided
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
# CAPTAIN-FACING DATA ROUTES
# =====================================

@main.route('/captain/team', methods=['GET'])
@login_required
def get_captain_team():
    """Get the current captain's team data including division info."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
    
    team = current_user.captain_of
    if not team:
        return jsonify({'error': 'No team assigned', 'team': None}), 200
    
    team_data = team.to_dict()
    
    # Add division info
    if team.division:
        team_data['division'] = team.division.to_dict()
        team_data['division_name'] = team.division.name
        
        # Add league info if available
        if team.division.league:
            team_data['league_name'] = team.division.league.name
    
    return jsonify({'team': team_data})

@main.route('/captain/fixtures', methods=['GET'])
@login_required
def get_captain_fixtures():
    """Get all fixtures for the captain's team."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
    
    team = current_user.captain_of
    if not team:
        return jsonify({'upcoming': [], 'past': []})
    
    now = datetime.utcnow()
    
    # Upcoming fixtures
    upcoming = Fixture.query.filter(
        ((Fixture.home_team_id == team.id) | (Fixture.away_team_id == team.id)),
        Fixture.date >= now,
        Fixture.status.in_(['scheduled', 'postponed'])
    ).order_by(Fixture.date.asc()).all()
    
    # Past/Completed fixtures
    past = Fixture.query.filter(
        ((Fixture.home_team_id == team.id) | (Fixture.away_team_id == team.id)),
        (Fixture.date < now) | (Fixture.status == 'completed')
    ).order_by(Fixture.date.desc()).all()
    
    # Enrich fixture data
    upcoming_list = []
    for f in upcoming:
        f_dict = f.to_dict()
        f_dict['is_home'] = f.home_team_id == team.id
        upcoming_list.append(f_dict)
    
    past_list = []
    for f in past:
        f_dict = f.to_dict()
        f_dict['is_home'] = f.home_team_id == team.id
        # Calculate result for captain's team
        if f.home_score is not None and f.away_score is not None:
            if f.home_team_id == team.id:
                if f.home_score > f.away_score:
                    f_dict['result'] = 'win'
                elif f.home_score < f.away_score:
                    f_dict['result'] = 'loss'
                else:
                    f_dict['result'] = 'draw'
            else:
                if f.away_score > f.home_score:
                    f_dict['result'] = 'win'
                elif f.away_score < f.home_score:
                    f_dict['result'] = 'loss'
                else:
                    f_dict['result'] = 'draw'
        past_list.append(f_dict)
    
    return jsonify({
        'upcoming': upcoming_list,
        'past': past_list,
        'team_name': team.name
    })

@main.route('/captain/standings', methods=['GET'])
@login_required
def get_captain_standings():
    """Get division standings for the captain's team."""
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
    
    team = current_user.captain_of
    if not team or not team.division:
        return jsonify({'standings': [], 'division': None, 'team_position': None})
    
    division = team.division
    teams = list(division.teams)
    
    # Sort teams by points, goal difference, goals for
    sorted_teams = sorted(
        teams,
        key=lambda t: (t.points, t.goal_difference, t.goals_for),
        reverse=True
    )
    
    standings = []
    team_position = None
    for pos, t in enumerate(sorted_teams, 1):
        if t.id == team.id:
            team_position = pos
        standings.append({
            'position': pos,
            'id': t.id,
            'name': t.name,
            'played': t.played,
            'won': t.won,
            'drawn': t.drawn,
            'lost': t.lost,
            'goals_for': t.goals_for,
            'goals_against': t.goals_against,
            'goal_difference': t.goal_difference,
            'points': t.points,
            'is_my_team': t.id == team.id
        })
    
    return jsonify({
        'standings': standings,
        'division': division.to_dict(),
        'league_name': division.league.name if division.league else None,
        'team_position': team_position
    })

@main.route('/admin/referee-coverage', methods=['POST'])
@login_required
def get_referee_coverage():
    """Get meaningful summary of game demand vs referee supply per slot."""
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
        
    # 1. Get Fixtures (Demand)
    fixtures = Fixture.query.filter(
        Fixture.date >= start_date,
        Fixture.date <= end_date,
        Fixture.status == 'scheduled'
    ).all()
    
    slots = {} # Key: (date_str, time_str)
    
    for f in fixtures:
        if not f.date or not f.time_slot: continue
        d_str = f.date.date().isoformat()
        t_str = f.time_slot
        key = (d_str, t_str)
        
        if key not in slots:
            slots[key] = {'date': d_str, 'time': t_str, 'game_count': 0, 'ref_count': 0}
            
        slots[key]['game_count'] += 1
        
    # 2. Get Availability (Supply)
    avails = RefereeAvailability.query.filter(
        RefereeAvailability.date >= start_date,
        RefereeAvailability.date <= end_date
    ).all()
    
    for a in avails:
        # Check if we care about this slot (i.e. are there games?) 
        # User wants to see "how many refs interested in certain times".
        # If refs sign up for a time with NO games, admin should probably know?
        # But mostly we care about coverage for existing games.
        # Let's include all slots where refs are available too, just in case.
        
        d_str = a.date.isoformat()
        t_str = a.time_slot
        key = (d_str, t_str)
        
        if key not in slots:
            slots[key] = {'date': d_str, 'time': t_str, 'game_count': 0, 'ref_count': 0}
            
        slots[key]['ref_count'] += 1
        
    # Convert to list
    result = list(slots.values())
    result.sort(key=lambda x: (x['date'], x['time']))
    
    return jsonify({'slots': result})

@main.route('/admin/allocate', methods=['POST'])
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
    
    # Ensure chats are created/updated for all allocated games
    for alloc in allocations:
        fid = alloc.get('fixture_id')
        if fid:
            fixture = Fixture.query.get(fid)
            if fixture:
                ensure_game_chat(fixture)
    
    return jsonify({
        'message': f'Allocation complete. Assigned {len(allocations)} fixtures.',
        'allocations': allocations
    })

@main.route('/fixtures/<int:fixture_id>/score', methods=['POST'])
@login_required
def submit_score(fixture_id):
    """Submit a score for a fixture."""
    fixture = Fixture.query.get(fixture_id)
    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404
        
    # Auth check
    is_admin = current_user.role == 'admin'
    is_assigned_ref = current_user.role == 'referee' and fixture.ref_id == current_user.id
    
    if not (is_admin or is_assigned_ref):
        return jsonify({'error': 'Unauthorized'}), 403
        
    # Check if already completed to prevent double-counting stats
    if fixture.status == 'completed' and not is_admin:
         return jsonify({'error': 'Match already finalized. Contact admin to edit.'}), 400
         
    # If admin edits a completed match, we need to be careful. 
    # For simplicity in this handover phase: Admin edits allow updating the score record 
    # but DOES NOT automatically recalculate league table history (complex).
    # We will simply block stats update if already completed, unless we implement revert logic.
    # Decision: Only update Table Stats if match was NOT previously completed.
    
    was_completed = fixture.status == 'completed'
    
    data = request.get_json()
    try:
        home_score = int(data['home_score'])
        away_score = int(data['away_score'])
    except (ValueError, KeyError):
        return jsonify({'error': 'Invalid scores'}), 400
        
    fixture.home_score = home_score
    fixture.away_score = away_score
    fixture.status = 'completed'
    
    if not was_completed:
        # Update Home Team
        home_team = Team.query.get(fixture.home_team_id)
        home_team.played += 1
        home_team.goals_for += home_score
        home_team.goals_against += away_score
        
        # Update Away Team
        away_team = Team.query.get(fixture.away_team_id)
        away_team.played += 1
        away_team.goals_for += away_score
        away_team.goals_against += home_score
        
        if home_score > away_score:
            home_team.won += 1
            home_team.points += 3
            away_team.lost += 1
        elif away_score > home_score:
            away_team.won += 1
            away_team.points += 3
            home_team.lost += 1
        else:
            home_team.drawn += 1
            home_team.points += 1
            away_team.drawn += 1
            away_team.points += 1
            
    db.session.commit()
    
    return jsonify({
        'message': 'Score submitted successfully', 
        'fixture': fixture.to_dict()
    })

# --- Pitch Management Routes ---

from app.models import Pitch, PitchAvailability

@main.route('/admin/pitches', methods=['GET'])
@login_required
def get_pitches():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    pitches = Pitch.query.all()
    result = []
    for p in pitches:
        p_dict = p.to_dict()
        # Add availability summary
        avail = PitchAvailability.query.filter_by(pitch_id=p.id).all()
        p_dict['availability'] = [a.to_dict() for a in avail]
        result.append(p_dict)
        
    return jsonify({'pitches': result})

@main.route('/admin/pitches/<int:pitch_id>', methods=['DELETE'])
@login_required
def delete_pitch(pitch_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    pitch = Pitch.query.get(pitch_id)
    if not pitch:
        return jsonify({'error': 'Pitch not found'}), 404
        
    try:
        # Delete availability slots first (cascade?) or let ORM handle it if configured
        # Safest to explicit delete
        PitchAvailability.query.filter_by(pitch_id=pitch_id).delete()
        
        # We should also check for fixtures assigned to this pitch
        # Ideally, we set fixture.pitch = "Archived" or similar, or block deletion if fixtures exist.
        # User asked for "delete pitch button", assuming they want to delete it.
        # We'll set connected fixtures to have pitch name preserved as string but no backend relation (if relation existed)
        # Since Fixture uses pitch NAME string (line 855), we don't need to stress about FK.
        
        db.session.delete(pitch)
        db.session.commit()
        return jsonify({'message': 'Pitch deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/admin/pitches', methods=['POST'])
@login_required
def create_pitch():
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

@main.route('/admin/pitches/<int:pitch_id>/availability', methods=['POST'])
@login_required
def update_pitch_availability(pitch_id):
    """Add or update availability for a specific date."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    pitch = Pitch.query.get(pitch_id)
    if not pitch:
        return jsonify({'error': 'Pitch not found'}), 404
        
    data = request.get_json()
    date_str = data.get('date')  # e.g. "2026-01-22"
    slots = data.get('slots')    # List of strings ["14:00", "15:00"]
    
    if not date_str:
        return jsonify({'error': 'Date is required'}), 400
    
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
         
    # Clear existing availability for that specific date
    PitchAvailability.query.filter_by(pitch_id=pitch_id, date=date_obj).delete()
    
    # Add new slots
    if slots:
        for slot in slots:
            pa = PitchAvailability(pitch_id=pitch_id, date=date_obj, time_slot=slot)
            db.session.add(pa)
            
    db.session.commit()
    
    return jsonify({'message': 'Availability updated'})

@main.route('/admin/pitches/<int:pitch_id>/availability/bulk', methods=['POST'])
@login_required
def bulk_add_availability(pitch_id):
    """Add availability for multiple dates at once (e.g., every Saturday for 10 weeks)."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    pitch = Pitch.query.get(pitch_id)
    if not pitch:
        return jsonify({'error': 'Pitch not found'}), 404
        
    data = request.get_json()
    dates = data.get('dates', [])  # List of date strings
    slots = data.get('slots', [])  # List of time slots to add to each date
    
    if not dates or not slots:
        return jsonify({'error': 'Dates and slots are required'}), 400
    
    added = 0
    for date_str in dates:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            for slot in slots:
                # Check if already exists
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

@main.route('/admin/pitches/availability/clear', methods=['POST'])
@login_required
def bulk_clear_availability():
    """Clear availability for a date range, optionally filtered by day of week."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    
    # Optional filters
    pitch_id = data.get('pitch_id')
    day_of_week = data.get('day_of_week') # 0=Mon, 6=Sun
    
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
        
    # If day_of_week is provided, we need to filter in python or complex SQL
    if day_of_week is not None:
        # Fetch all candidates
        candidates = query.all()
        deleted = 0
        for slot in candidates:
            if slot.date.weekday() == int(day_of_week):
                db.session.delete(slot)
                deleted += 1
    else:
        # Bulk delete
        deleted = query.delete(synchronize_session=False)
        
    db.session.commit()
    return jsonify({'message': f'Cleared {deleted} slots'})

@main.route('/admin/pitches/<int:pitch_id>/availability/<int:slot_id>', methods=['DELETE'])
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

@main.route('/admin/pitches/availability-summary', methods=['GET'])
@login_required
def get_availability_summary():
    """Get all pitch availability slots with booking status for calendar view."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get optional date range from query params
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Get all pitches
    pitches = Pitch.query.all()
    
    # Get all scheduled fixtures to check for booked slots
    scheduled_fixtures = Fixture.query.filter(
        Fixture.status.in_(['scheduled', 'completed'])
    ).all()
    
    # Create a set of booked slots: (pitch_name, date_iso, time_slot)
    booked_slots = set()
    for f in scheduled_fixtures:
        if f.pitch and f.time_slot and f.date:
            booked_slots.add((f.pitch, f.date.date().isoformat() if hasattr(f.date, 'date') else f.date.isoformat(), f.time_slot))
    
    result = []
    for pitch in pitches:
        pitch_data = {
            'id': pitch.id,
            'name': pitch.name,
            'status': pitch.status,
            'slots': []
        }
        
        # Get availability for this pitch, optionally filtered by date range
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

# --- League & Division Management Routes ---

@main.route('/admin/leagues', methods=['GET'])
@login_required
def get_leagues():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    leagues = League.query.all()
    result = []
    for l in leagues:
        l_dict = l.to_dict()
        # Nest divisions and teams for the frontend
        l_dict['divisions'] = []
        for d in l.divisions:
            d_dict = d.to_dict()
            d_dict['teams'] = [t.id for t in d.teams] # Send IDs for checkbox state
            l_dict['divisions'].append(d_dict)
        result.append(l_dict)
        
    return jsonify({'leagues': result})


@main.route('/admin/leagues', methods=['POST'])
@login_required
def create_league():
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
    
    # Return structure matching GET
    l_dict = league.to_dict()
    l_dict['divisions'] = []
    
    return jsonify({'message': 'League created', 'league': l_dict})

@main.route('/admin/leagues/<int:league_id>', methods=['DELETE'])
@login_required
def delete_league(league_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
    
    try:
        # Explicitly delete divisions and fixtures to avoid reliance on ORM cascade
        for division in league.divisions:
             # Delete fixtures for this division (where home/away team is in division)
            team_ids = [t.id for t in division.teams]
            if team_ids:
                # Find all fixtures to be deleted
                fixtures = Fixture.query.filter(
                    (Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))
                ).all()
                if fixtures:
                    # Clear referee availability for these fixture dates/times
                    for f in fixtures:
                        if f.date and f.time_slot:
                            fixture_date = f.date.date() if hasattr(f.date, 'date') else f.date
                            RefereeAvailability.query.filter_by(
                                date=fixture_date,
                                time_slot=f.time_slot
                            ).delete(synchronize_session=False)
                    
                    fixture_ids = [f.id for f in fixtures]
                    # Delete Fixtures
                    Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

            # Unassign teams from division and RESET their stats
            for team in division.teams:
                team.division_id = None
                # Reset all stats
                team.played = 0
                team.won = 0
                team.drawn = 0
                team.lost = 0
                team.points = 0
                team.goals_for = 0
                team.goals_against = 0
            db.session.delete(division)
            
        db.session.delete(league)
        db.session.commit()
        return jsonify({'message': 'League and associated items deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting league: {e}")
        return jsonify({'error': str(e)}), 500

@main.route('/admin/divisions/<int:division_id>', methods=['DELETE'])
@login_required
def delete_division(division_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404
        
    try:
        # Delete fixtures associated with this division
        team_ids = [t.id for t in division.teams]
        if team_ids:
            # Find all fixtures to be deleted
            fixtures = Fixture.query.filter(
                (Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))
            ).all()
            if fixtures:
                # Clear referee availability for these fixture dates/times
                for f in fixtures:
                    if f.date and f.time_slot:
                        fixture_date = f.date.date() if hasattr(f.date, 'date') else f.date
                        RefereeAvailability.query.filter_by(
                            date=fixture_date,
                            time_slot=f.time_slot
                        ).delete(synchronize_session=False)
                
                fixture_ids = [f.id for f in fixtures]
                # Delete Fixtures
                Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

        # Unassign teams and RESET their stats
        for team in division.teams:
            team.division_id = None
            # Reset all stats
            team.played = 0
            team.won = 0
            team.drawn = 0
            team.lost = 0
            team.points = 0
            team.goals_for = 0
            team.goals_against = 0
            
        db.session.delete(division)
        db.session.commit()
        return jsonify({'message': 'Division deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting division: {e}")
        return jsonify({'error': str(e)}), 500

@main.route('/admin/leagues/<int:league_id>/divisions', methods=['POST'])
@login_required
def create_division(league_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    league = League.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
        
    # Bug Fix: Division model requires day_of_week
    # Use provided day, or league default, or fallback
    day = data.get('day', league.default_day or 'Wednesday')
    
    div = Division(name=name, league_id=league_id, day_of_week=day)
    db.session.add(div)
    db.session.commit()
    
    d_dict = div.to_dict()
    d_dict['teams'] = []
    
    return jsonify({'message': 'Division created', 'division': d_dict})

@main.route('/admin/divisions/<int:division_id>/teams', methods=['POST'])
@login_required
def update_division_teams(division_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    div = Division.query.get(division_id)
    if not div:
        return jsonify({'error': 'Division not found'}), 404
        
    data = request.get_json()
    team_ids = data.get('teamIdentifiers', []) # Expecting list of IDs
    
    # Logic: Update division_id for these teams. 
    # For simplicity, we first clear this division from all teams (set null? or handle carefully)
    # Actually, teams belong to one division. 
    # So we iterate through specific teams and set their division_id.
    
    # 1. Unassign all teams currently in this division? 
    # Or just overwrite? Let's just update the ones passed in.
    # Ideally we want to "set the set contents".
    
    # Reset all teams currently in this division (optional, depending on UX)
    # For now, let's just add the selected ones.
    # Better: Update 'division_id' for the given teams. 
    
    for t_id in team_ids:
        team = Team.query.get(t_id)
        if team:
            team.division_id = division_id
            
    db.session.commit()
    
    return jsonify({'message': 'Teams assigned'})

@main.route('/admin/divisions/<int:division_id>/fixtures', methods=['GET'])
@login_required
def get_division_fixtures(division_id):
    """Get all fixtures for a specific division (where home or away team is in the division)."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404
    
    # Get all team IDs in this division
    team_ids = [t.id for t in division.teams]
    
    if not team_ids:
        return jsonify({'fixtures': []})
    
    # Find fixtures where home_team OR away_team is in the division
    fixtures = Fixture.query.filter(
        (Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))
    ).order_by(Fixture.date.desc()).all()
    
    return jsonify({
        'fixtures': [f.to_dict() for f in fixtures],
        'division': division.to_dict()
    })


@main.route('/admin/divisions/<int:division_id>/overview', methods=['GET'])
@login_required
def get_division_overview(division_id):
    """Get comprehensive division overview with standings and fixtures."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    division = Division.query.get(division_id)
    if not division:
        return jsonify({'error': 'Division not found'}), 404
    
    # Get teams in this division  
    teams = list(division.teams)
    team_ids = [t.id for t in teams]
    
    # Sort teams by points (desc), goal difference (desc), goals for (desc)
    sorted_teams = sorted(
        teams, 
        key=lambda t: (t.points, t.goal_difference, t.goals_for), 
        reverse=True
    )
    
    standings = []
    for pos, team in enumerate(sorted_teams, 1):
        standings.append({
            'position': pos,
            'id': team.id,
            'name': team.name,
            'played': team.played,
            'won': team.won,
            'drawn': team.drawn,
            'lost': team.lost,
            'goals_for': team.goals_for,
            'goals_against': team.goals_against,
            'goal_difference': team.goal_difference,
            'points': team.points
        })
    
    # Get fixtures for this division
    if not team_ids:
        upcoming_fixtures = []
        past_fixtures = []
    else:
        now = datetime.utcnow()
        
        # Upcoming: date >= now, sorted by date ASC (soonest first)
        upcoming = Fixture.query.filter(
            ((Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))),
            Fixture.date >= now,
            Fixture.status.in_(['scheduled', 'postponed'])
        ).order_by(Fixture.date.asc()).all()
        
        # Past: date < now OR status is completed, sorted by date DESC (most recent first)
        past = Fixture.query.filter(
            ((Fixture.home_team_id.in_(team_ids)) | (Fixture.away_team_id.in_(team_ids))),
            (Fixture.date < now) | (Fixture.status == 'completed')
        ).order_by(Fixture.date.desc()).all()
        
        # Enrich fixture data with referee info (already in to_dict but let's be explicit)
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

@main.route('/admin/teams', methods=['GET'])
@login_required
def get_all_teams():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    teams = Team.query.all()
    return jsonify({'teams': [t.to_dict() for t in teams]})

@main.route('/admin/teams', methods=['POST'])
@login_required
def create_team():
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

@main.route('/admin/teams/<int:team_id>', methods=['DELETE'])
@login_required
def delete_team(team_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    
    try:
        # Delete all players on this team (players have NOT NULL constraint on team_id)
        player.query.filter_by(team_id=team_id).delete(synchronize_session='fetch')
        
        # Delete all fixtures involving this team (fixtures have NOT NULL constraint on team IDs)
        fixtures_to_delete = Fixture.query.filter(
            (Fixture.home_team_id == team_id) | (Fixture.away_team_id == team_id)
        ).all()
        
        if fixtures_to_delete:
            fixture_ids = [f.id for f in fixtures_to_delete]
            Fixture.query.filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)
        
        # Now delete the team
        db.session.delete(team)
        db.session.commit()
        
        return jsonify({'message': 'Team deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting team: {e}")
        return jsonify({'error': str(e)}), 500

# --- Manual Fixture Management Routes ---

@main.route('/admin/fixtures', methods=['POST'])
@login_required
def create_fixture():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    # Expecting: homeTeam, awayTeam, date, time, venue, status
    # Note: Frontend sends Team Names or IDs? 
    # Let's support Names for now to match current frontend mock logic, 
    # OR better, update frontend to send IDs. 
    # Given the mock frontend sends Names ("Engineering Eagles"), we need to lookup IDs.
    
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
    
    if data.get('homeScore') is not None: fixture.home_score = int(data.get('homeScore'))
    if data.get('awayScore') is not None: fixture.away_score = int(data.get('awayScore'))
    
    db.session.add(fixture)
    db.session.commit()
    
    return jsonify({'message': 'Fixture created', 'fixture': fixture.to_dict()})

@main.route('/admin/fixtures/<int:fixture_id>', methods=['PUT'])
@login_required
def update_fixture(fixture_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    fixture = Fixture.query.get(fixture_id)
    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404
        
    data = request.get_json()
    
    # Update fields
    if 'homeTeam' in data: 
        t = Team.query.filter_by(name=data['homeTeam']).first()
        if t: fixture.home_team_id = t.id
        
    if 'awayTeam' in data:
        t = Team.query.filter_by(name=data['awayTeam']).first()
        if t: fixture.away_team_id = t.id
        
    if 'date' in data:
        try:
            fixture.date = datetime.strptime(data['date'], '%Y-%m-%d')
        except: pass
        
    if 'time' in data: fixture.time_slot = data['time']
    if 'venue' in data: fixture.pitch = data['venue']
    if 'status' in data: fixture.status = data['status']
    if 'refereeId' in data: fixture.ref_id = data['refereeId']
    
    if data.get('homeScore') is not None: fixture.home_score = int(data.get('homeScore'))
    if data.get('awayScore') is not None: fixture.away_score = int(data.get('awayScore'))
    
    db.session.commit()
    return jsonify({'message': 'Fixture updated', 'fixture': fixture.to_dict()})

@main.route('/admin/fixtures/<int:fixture_id>', methods=['DELETE'])
@login_required
def delete_fixture(fixture_id):
    if current_user.role != 'admin':
        print(f"Unauthorized delete attempt by {current_user.id}")
        return jsonify({'error': 'Unauthorized'}), 403
        
    print(f"Deleting fixture {fixture_id}")
    fixture = Fixture.query.get(fixture_id)

    if not fixture:
        return jsonify({'error': 'Fixture not found'}), 404
        
    db.session.delete(fixture)
    db.session.commit()
    return jsonify({'message': 'Fixture deleted'})

@main.route('/admin/availability-window', methods=['GET', 'POST'])
@login_required
def manage_availability_window():
    if request.method == 'GET':
        # Return current window status
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
    is_open = data.get('isOpen') # boolean
    
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

@main.route('/admin/fixtures/cancel-day', methods=['POST'])
@login_required
def cancel_fixtures_by_day():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({'error': 'Date is required'}), 400
        
    try:
        target_date_str = data['date'] # YYYY-MM-DD
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
        
    # Find active fixtures on that day
    # Assuming Fixture.date is datetime, we filter by date() or range
    # SQLite/SQLAlchemy date comparison on datetime column:
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
        # Log notification logic here (mock)
        count += 1
        
    if count > 0:
        db.session.commit()
    
    return jsonify({
        'message': f'Successfully cancelled {count} games for {target_date_str}',
        'count': count,
        'date': target_date_str
    })

# --- Leaderboard & Stats Routes ---

@main.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    # Public route, no login required? Usually yes, but let's keep it simple.
    # Frontend might be public or protected. Let's make it public for now or require login if preferred.
    # Requirement: "View League Table".
    
    # Sort teams by Points (desc), Goal Diff (desc), Goals For (desc)
    teams = Team.query.all()
    
    # Python generic sort since calculations like GD are properties
    # Ideally do this in SQL for scale, but for small league this is fine.
    sorted_teams = sorted(teams, key=lambda t: (t.points, t.goal_difference, t.goals_for), reverse=True)
    
    return jsonify({'leaderboard': [t.to_dict() for t in sorted_teams]})

@main.route('/api/top-scorers', methods=['GET'])
def get_top_scorers():
    from app.models import player
    
    # Get top 10 scorers
    players = player.query.order_by(player.goals.desc()).limit(10).all()
    
    result = []
    for p in players:
        p_dict = p.to_dict()
        p_dict['team_name'] = p.team.name
        result.append(p_dict)
        
    return jsonify({'scorers': result})
# =====================================
# NOTIFICATIONS & APPROVALS
# =====================================

@main.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.timestamp.desc()).all()
    return jsonify({'notifications': [n.to_dict() for n in notifs]})

@main.route('/api/notifications/<int:id>/read', methods=['POST'])
@login_required
def mark_notification_read(id):
    notif = Notification.query.get_or_404(id)
    if notif.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    notif.read = True
    db.session.commit()
    return jsonify({'message': 'Marked read'})

@main.route('/api/notifications/mark-all-read', methods=['POST'])
@login_required
def mark_all_notifications_read():
    Notification.query.filter_by(user_id=current_user.id, read=False).update({'read': True})
    db.session.commit()
    return jsonify({'message': 'All marked read'})

@main.route('/api/admin/fixtures/cancel-day', methods=['POST'])
@login_required
def emergency_cancel_day():
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
        
    # Find fixtures on this date
    # Fixture.date is DateTime, so we need to filter by day
    # SQLAlchemy: func.date(Fixture.date) == cancel_date
    fixtures = Fixture.query.filter(
        func.date(Fixture.date) == cancel_date,
        Fixture.status == 'scheduled'
    ).all()
    
    count = 0
    for f in fixtures:
        f.status = 'cancelled'
        count += 1
        
        # Notify Ref
        if f.ref_id:
            db.session.add(Notification(
                user_id=f.ref_id,
                title="Fixture Cancelled (Emergency)",
                message=f"Game {f.home_team.name} vs {f.away_team.name} on {date_str} cancelled: {reason_id}. {message}",
                type='urgent'
            ))
            
        # Notify Captains
        caps = []
        if f.home_team.captain_id: caps.append(f.home_team.captain_id)
        if f.away_team.captain_id: caps.append(f.away_team.captain_id)
        
        for cap_id in caps:
             db.session.add(Notification(
                user_id=cap_id,
                title="Fixture Cancelled (Emergency)",
                message=f"Game vs {f.away_team.name if f.home_team.captain_id == cap_id else f.home_team.name} cancelled: {reason_id}. {message}",
                type='urgent'
            ))
            
    db.session.commit()
    return jsonify({'message': f'Cancelled {count} games', 'count': count})

@main.route('/api/captain/fixtures/<int:id>/forfeit', methods=['POST'])
@login_required
def captain_forfeit_fixture(id):
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
        
    fixture = Fixture.query.get_or_404(id)
    team = current_user.captain_of
    
    if not team or (fixture.home_team_id != team.id and fixture.away_team_id != team.id):
        return jsonify({'error': 'Not your game'}), 403
        
    # Record forfeit (3-0 loss)
    is_home = (fixture.home_team_id == team.id)
    fixture.status = 'completed'
    fixture.home_score = 0 if is_home else 3
    fixture.away_score = 3 if is_home else 0
    
    # Notify Admin
    from app.models import User
    admins = User.query.filter_by(role='admin').all()
    for admin in admins:
         db.session.add(Notification(
            user_id=admin.id,
            title="Fixture Forfeited",
            message=f"{team.name} forfeited match vs {fixture.away_team.name if is_home else fixture.home_team.name}",
            type='urgent'
        ))
        
    # Notify Referee
    if fixture.ref_id:
         db.session.add(Notification(
            user_id=fixture.ref_id,
            title="Match Forfeited",
            message=f"Match {fixture.home_team.name} vs {fixture.away_team.name} was forfeited by {team.name}.",
            type='info'
        ))
    
    # Notify Opposing Captain
    opp_team = fixture.away_team if is_home else fixture.home_team
    if opp_team.captain_id:
         db.session.add(Notification(
            user_id=opp_team.captain_id,
            title="Opponent Forfeited",
            message=f"Your match vs {team.name} was forfeited. You win 3-0.",
            type='success'
        ))
        
    db.session.commit()
    return jsonify({'message': 'Match forfeited'})

@main.route('/api/captain/fixtures/<int:id>/postpone', methods=['POST'])
@login_required
def request_postponement(id):
    if current_user.role != 'captain':
        return jsonify({'error': 'Unauthorized'}), 403
        
    fixture = Fixture.query.get_or_404(id)
    team = current_user.captain_of
    
    if not team or (fixture.home_team_id != team.id and fixture.away_team_id != team.id):
        return jsonify({'error': 'Not your game'}), 403
        
    # Check if pending request exists
    existing = PostponementRequest.query.filter_by(fixture_id=id, status='pending').first()
    if existing:
        return jsonify({'error': 'Request already pending'}), 400
        
    req = PostponementRequest(
        fixture_id=id, 
        requester_team_id=team.id,
        reason="Captain requested via dashboard"
    )
    db.session.add(req)
    
    # Notify Admin
    from app.models import User
    admins = User.query.filter_by(role='admin').all()
    for admin in admins:
         db.session.add(Notification(
            user_id=admin.id,
            title="Postponement Request",
            message=f"{team.name} requested postponement for match vs {fixture.away_team.name if fixture.home_team_id == team.id else fixture.home_team.name}",
            type='info'
        ))
        
    db.session.commit()
    return jsonify({'message': 'Request submitted'})

@main.route('/api/admin/approvals', methods=['GET'])
@login_required
def get_approvals():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    reqs = PostponementRequest.query.order_by(PostponementRequest.submitted_at.desc()).all()
    return jsonify({'requests': [r.to_dict() for r in reqs]})

@main.route('/api/admin/approvals/<int:id>/<action>', methods=['POST'])
@login_required
def handle_approval(id, action):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    req = PostponementRequest.query.get_or_404(id)
    
    if action == 'approve':
        req.status = 'approved'
        req.fixture.status = 'postponed'
        
        # Notify everyone
        # Ref
        if req.fixture.ref_id:
             db.session.add(Notification(
                user_id=req.fixture.ref_id,
                title="Match Postponed",
                message=f"Match {req.fixture.home_team.name} vs {req.fixture.away_team.name} has been POSTPONED.",
                type='urgent'
            ))
        # Captains
        teams = [req.fixture.home_team, req.fixture.away_team]
        for t in teams:
            if t.captain_id:
                 db.session.add(Notification(
                    user_id=t.captain_id,
                    title="Match Postponed",
                    message=f"Your match vs {req.fixture.away_team.name if t.id == req.fixture.home_team_id else req.fixture.home_team.name} has been postponed.",
                    type='info'
                ))
                
    elif action == 'deny':
        req.status = 'denied'
        # Notify requester
        if req.requester_team.captain_id:
             db.session.add(Notification(
                user_id=req.requester_team.captain_id,
                title="Postponement Denied",
                message=f"Your postponement request for match vs {req.fixture.away_team.name if req.requester_team_id == req.fixture.home_team_id else req.fixture.home_team.name} was denied.",
                type='urgent'
            ))
            
    else:
        return jsonify({'error': 'Invalid action'}), 400
        
    db.session.commit()
    return jsonify({'message': f'Request {action}d'})
# =====================================
# CHAT & MESSAGING SYSTEM
# =====================================

def ensure_game_chat(fixture):
    """Ensure a chat channel exists for a fixture and correct participants are added."""
    # Check if chat exists
    chat = ChatChannel.query.filter_by(fixture_id=fixture.id, type='game').first()
    if not chat:
        chat = ChatChannel(
            name=f"{fixture.home_team.name} vs {fixture.away_team.name}",
            type='game',
            fixture_id=fixture.id
        )
        db.session.add(chat)
        db.session.flush() # get ID
        
        # Add Captains
        if fixture.home_team.captain_id:
            if not ChatParticipant.query.filter_by(user_id=fixture.home_team.captain_id, channel_id=chat.id).first():
                db.session.add(ChatParticipant(user_id=fixture.home_team.captain_id, channel_id=chat.id))
        
        if fixture.away_team.captain_id:
             if not ChatParticipant.query.filter_by(user_id=fixture.away_team.captain_id, channel_id=chat.id).first():
                db.session.add(ChatParticipant(user_id=fixture.away_team.captain_id, channel_id=chat.id))
            
    # Always ensure Ref is participant if assigned
    if fixture.ref_id:
        # Check if already participant
        existing = ChatParticipant.query.filter_by(user_id=fixture.ref_id, channel_id=chat.id).first()
        if not existing:
             db.session.add(ChatParticipant(user_id=fixture.ref_id, channel_id=chat.id))
             
             # Optional: Add system message
             db.session.add(ChatMessage(
                 channel_id=chat.id, 
                 sender_id=fixture.ref_id, 
                 content="I have joined the chat as the referee for this match."
             ))
             
    db.session.commit()
    return chat

@main.route('/api/chats', methods=['GET'])
@login_required
def get_chats():
    """Get all chat channels for the current user."""
    participations = ChatParticipant.query.filter_by(user_id=current_user.id).all()
    channels = []
    
    for p in participations:
        channel = p.channel
        channels.append(channel.to_dict())
        
    # Sort by last message timestamp?
    # For now just return list
    return jsonify({'chats': channels})

@main.route('/api/chats/create', methods=['POST'])
@login_required
def create_chat():
    """Create a direct chat with another user."""
    data = request.get_json()
    other_user_id = data.get('userId')
    
    if not other_user_id:
        return jsonify({'error': 'User ID required'}), 400
        
    # Check if DM already exists?
    # Simplified: Just create new or return existing if complex logic needed.
    # For now, create new 'direct' channel
    
    from app.models import User
    other_user = User.query.get(other_user_id)
    if not other_user:
        return jsonify({'error': 'User not found'}), 404
        
    channel = ChatChannel(
        name=f"{current_user.name} & {other_user.name}",
        type='direct'
    )
    db.session.add(channel)
    db.session.flush()
    
    db.session.add(ChatParticipant(user_id=current_user.id, channel_id=channel.id))
    db.session.add(ChatParticipant(user_id=other_user.id, channel_id=channel.id))
    db.session.commit()
    
    return jsonify({'chat': channel.to_dict()})

@main.route('/api/chats/<int:channel_id>/messages', methods=['GET'])
@login_required
def get_messages(channel_id):
    """Get messages for a channel."""
    # Check participation
    part = ChatParticipant.query.filter_by(user_id=current_user.id, channel_id=channel_id).first()
    if not part and current_user.role != 'admin': # Admin can see all? Or restricted? Let's restrict for now unless admin tool.
        return jsonify({'error': 'Unauthorized'}), 403
        
    channel = ChatChannel.query.get(channel_id)
    if not channel:
        return jsonify({'error': 'Channel not found'}), 404
        
    messages = channel.messages.order_by(ChatMessage.timestamp.asc()).all()
    
    return jsonify({'messages': [m.to_dict() for m in messages]})

@main.route('/api/chats/<int:channel_id>/messages', methods=['POST'])
@login_required
def send_message(channel_id):
    """Send a message to a channel."""
    part = ChatParticipant.query.filter_by(user_id=current_user.id, channel_id=channel_id).first()
    if not part:
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.get_json()
    content = data.get('content')
    if not content:
        return jsonify({'error': 'Content required'}), 400
        
    msg = ChatMessage(
        channel_id=channel_id,
        sender_id=current_user.id,
        content=content
    )
    db.session.add(msg)
    db.session.commit()
    
    return jsonify({'message': msg.to_dict()})
