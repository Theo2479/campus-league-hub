"""
Production WSGI entry point for gunicorn.
Usage: gunicorn --worker-class eventlet -w 1 wsgi:app
"""
import eventlet
eventlet.monkey_patch()

from app import create_app, socketio

app = create_app()
