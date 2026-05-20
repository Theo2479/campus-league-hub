"""
Common routes available to all authenticated users.
Includes health check, leaderboard, notifications, and approvals.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import Team, Notification, PostponementRequest, Player, League
import logging

logger = logging.getLogger(__name__)

common = Blueprint('common', __name__)


@common.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'message': 'League API is running'})


# =====================================
# LEADERBOARD & STATS
@common.route('/leagues', methods=['GET'])
def get_leagues():
    """Get all leagues for filtering."""
    leagues = League.query.all()
    return jsonify({'leagues': [{'id': l.id, 'name': l.name} for l in leagues]})

@common.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get league table aggregated across all divisions for a global leaderboard, or filtered by league_id."""
    league_id_str = request.args.get('league_id')
    league_id = int(league_id_str) if league_id_str and league_id_str.isdigit() else None

    teams = Team.query.all()
    
    leaderboard_data = []
    for t in teams:
        if league_id:
            divisions = [td for td in t.divisions if td.division.league_id == league_id]
            if not divisions:
                continue
        else:
            divisions = t.divisions

        # Aggregate stats from filtered divisions the team is in
        played = sum(td.played for td in divisions)
        won = sum(td.won for td in divisions)
        drawn = sum(td.drawn for td in divisions)
        lost = sum(td.lost for td in divisions)
        points = sum(td.points for td in divisions)
        goals_for = sum(td.goals_for for td in divisions)
        goals_against = sum(td.goals_against for td in divisions)
        goal_difference = goals_for - goals_against
        
        team_data = {
            'id': t.id,
            'name': t.name,
            'stats': {
                'played': played,
                'won': won,
                'drawn': drawn,
                'lost': lost,
                'goals_for': goals_for,
                'goals_against': goals_against,
                'goal_difference': goal_difference,
                'points': points
            }
        }
        leaderboard_data.append(team_data)
        
    sorted_teams = sorted(
        leaderboard_data, 
        key=lambda d: (d['stats']['points'], d['stats']['goal_difference'], d['stats']['goals_for']), 
        reverse=True
    )
    
    return jsonify({'leaderboard': sorted_teams})


@common.route('/top-scorers', methods=['GET'])
def get_top_scorers():
    """Get top 10 scorers."""
    players = Player.query.order_by(Player.goals.desc()).limit(10).all()
    
    result = []
    for p in players:
        p_dict = p.to_dict()
        p_dict['team_name'] = p.team.name
        result.append(p_dict)
        
    return jsonify({'scorers': result})


# =====================================
# NOTIFICATIONS
# =====================================

@common.route('/notifications', methods=['GET'])
@login_required
def get_notifications():
    """Get all notifications for the current user."""
    notifs = Notification.query.filter_by(user_id=current_user.id)\
        .order_by(Notification.timestamp.desc()).all()
    return jsonify({'notifications': [n.to_dict() for n in notifs]})


@common.route('/notifications/<int:id>/read', methods=['POST'])
@login_required
def mark_notification_read(id):
    """Mark a single notification as read."""
    notif = Notification.query.get_or_404(id)
    if notif.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    notif.read = True
    db.session.commit()
    return jsonify({'message': 'Marked read'})


@common.route('/notifications/mark-all-read', methods=['POST'])
@login_required
def mark_all_notifications_read():
    """Mark all notifications as read for the current user."""
    Notification.query.filter_by(user_id=current_user.id, read=False)\
        .update({'read': True})
    db.session.commit()
    return jsonify({'message': 'All marked read'})


@common.route('/notifications/clear-all', methods=['DELETE'])
@login_required
def clear_all_notifications():
    """Delete all notifications for the current user."""
    count = Notification.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'message': f'{count} notifications cleared'})


# =====================================
# APPROVALS (Admin view but shared routes)
# =====================================

@common.route('/admin/approvals', methods=['GET'])
@login_required
def get_approvals():
    """Get all postponement requests."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    reqs = PostponementRequest.query.order_by(
        PostponementRequest.submitted_at.desc()
    ).all()
    return jsonify({'requests': [r.to_dict() for r in reqs]})


@common.route('/admin/approvals/<int:id>/<action>', methods=['POST'])
@login_required
def handle_approval(id, action):
    """Approve or deny a postponement request."""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    req = PostponementRequest.query.get_or_404(id)
    
    if action == 'approve':
        req.status = 'approved'
        req.fixture.status = 'postponed'
        
        # Notify referee
        if req.fixture.ref_id:
            db.session.add(Notification(
                user_id=req.fixture.ref_id,
                title="Match Postponed",
                message=f"Match {req.fixture.home_team.name} vs {req.fixture.away_team.name} has been POSTPONED.",
                type='urgent'
            ))
            
        # Notify captains
        teams = [req.fixture.home_team, req.fixture.away_team]
        for t in teams:
            if t.captain_id:
                opponent = req.fixture.away_team.name if t.id == req.fixture.home_team_id else req.fixture.home_team.name
                db.session.add(Notification(
                    user_id=t.captain_id,
                    title="Match Postponed",
                    message=f"Your match vs {opponent} has been postponed.",
                    type='info'
                ))
                
    elif action == 'deny':
        req.status = 'denied'
        # Notify requester
        if req.requester_team.captain_id:
            opponent = req.fixture.away_team.name if req.requester_team_id == req.fixture.home_team_id else req.fixture.home_team.name
            db.session.add(Notification(
                user_id=req.requester_team.captain_id,
                title="Postponement Denied",
                message=f"Your postponement request for match vs {opponent} was denied.",
                type='urgent'
            ))
    else:
        return jsonify({'error': 'Invalid action'}), 400
        
    db.session.commit()
    return jsonify({'message': f'Request {action}d'})
