"""
Admin routes package.
Defines the single `admin` Blueprint and imports all sub-modules so their
route decorators are registered on it.
"""
from flask import Blueprint

admin = Blueprint('admin', __name__)

# Import sub-modules after blueprint creation to avoid circular imports
from app.routes.admin import (  # noqa: E402, F401
    referees,
    captains,
    pitches,
    leagues,
    teams,
    fixtures,
    tournaments,
    settings,
)
