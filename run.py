import eventlet
eventlet.monkey_patch()

import os
from app import create_app, db, socketio

app = create_app()

if __name__ == '__main__':
    is_production = os.environ.get('FLASK_ENV', 'development') == 'production'
    
    with app.app_context():
        db.create_all()
    
    socketio.run(
        app,
        debug=not is_production,
        port=int(os.environ.get('PORT', 5001)),
        host='0.0.0.0'
    )
