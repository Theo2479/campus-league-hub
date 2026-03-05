"""
Common routes package.
Exports all blueprint modules for registration in the main app.
"""
from app.routes.common import common
from app.routes.admin import admin
from app.routes.referee import referee
from app.routes.captain import captain
from app.routes.fixtures import fixtures
from app.routes.chat import chat
from app.routes.friendly import friendly

__all__ = ['common', 'admin', 'referee', 'captain', 'fixtures', 'chat', 'friendly']
