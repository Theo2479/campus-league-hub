from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app.models import User
from app import db

auth = Blueprint('auth', __name__)

def _enrich_user_data(user):
    """Add role-specific data to user dict."""
    user_data = user.to_dict()
    
    # Add extra stats for referees
    if user.role == 'referee':
        from app.models import Fixture
        games_completed = Fixture.query.filter_by(ref_id=user.id, status='completed').count()
        games_assigned = Fixture.query.filter_by(ref_id=user.id).count()
        user_data['games_reffed'] = games_completed
        user_data['games_assigned'] = games_assigned
    
    # Add team info for captains
    if user.role == 'captain':
        team = user.captain_of
        if team:
            user_data['team_id'] = team.id
            user_data['team_name'] = team.name
            if team.division:
                user_data['division_name'] = team.division.name
                
    return user_data

@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
        
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and user.check_password(password):
        login_user(user)
        return jsonify({
            'message': 'Logged in successfully',
            'user': _enrich_user_data(user)
        })
    
    return jsonify({'error': 'Invalid username or password'}), 401

@auth.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@auth.route('/me', methods=['GET'])
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({'user': _enrich_user_data(current_user)})
    return jsonify({'user': None}), 401

