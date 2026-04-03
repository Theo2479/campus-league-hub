"""
Notification helper functions.

These helpers only *add* Notification rows to the SQLAlchemy session.
The caller is responsible for calling db.session.commit() afterwards,
which keeps transaction control in the route handler and avoids double-commit bugs.
"""
from app import db
from app.models import Notification, User


def notify_user(user_id: int, title: str, message: str, type: str = 'info') -> None:
    """Queue a single notification for one user."""
    db.session.add(Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type
    ))


def notify_admins(title: str, message: str, type: str = 'info') -> None:
    """Queue a notification for every admin user (not just the first one)."""
    admins = User.query.filter_by(role='admin').all()
    for admin in admins:
        notify_user(admin.id, title, message, type)


def notify_fixture_participants(fixture, title: str, message: str, type: str = 'info') -> None:
    """Queue a notification for the referee and both team captains of a fixture."""
    if fixture.ref_id:
        notify_user(fixture.ref_id, title, message, type)
    if fixture.home_team and fixture.home_team.captain_id:
        notify_user(fixture.home_team.captain_id, title, message, type)
    if fixture.away_team and fixture.away_team.captain_id:
        notify_user(fixture.away_team.captain_id, title, message, type)
