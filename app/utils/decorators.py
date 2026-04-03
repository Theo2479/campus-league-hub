"""
Role-check decorators for Flask routes.
"""
from functools import wraps
from flask import jsonify
from flask_login import current_user


def require_role(*roles):
    """Restrict a route to users whose role is in *roles.

    Usage::

        @admin.route('/admin/teams')
        @login_required
        @require_role('admin')
        def get_teams():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'error': 'Unauthorized'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
