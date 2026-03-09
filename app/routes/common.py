"""
Common routes available to all authenticated users.
Includes health check, leaderboard, notifications, and approvals.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import Team, Notification, PostponementRequest, Player
import logging

logger = logging.getLogger(__name__)

common = Blueprint('common', __name__)


@common.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'message': 'League API is running'})


# =====================================
# LEADERBOARD & STATS
# =====================================

@common.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get league table sorted by points."""
    teams = Team.query.all()
    sorted_teams = sorted(
        teams, 
        key=lambda t: (t.points, t.goal_difference, t.goals_for), 
        reverse=True
    )
    return jsonify({'leaderboard': [t.to_dict() for t in sorted_teams]})


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
