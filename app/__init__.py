from flask import Flask, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_migrate import Migrate
import os

db = SQLAlchemy()
login_manager = LoginManager()
socketio = SocketIO()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    
    # Load .env file if python-dotenv is available
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    # ----------------------------
    # Configuration from environment
    # ----------------------------
    is_production = os.environ.get('FLASK_ENV', 'development') == 'production'
    
    # Secret key — REQUIRED in production
    secret_key = os.environ.get('SECRET_KEY')
    if is_production and (not secret_key or secret_key == 'change-me-to-a-random-64-char-string'):
        raise RuntimeError("SECRET_KEY must be set to a secure random value in production!")
    app.config['SECRET_KEY'] = secret_key or 'dev-secret-key-not-for-production'
    
    # Database
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///league.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Session cookie security
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SECURE'] = is_production  # Requires HTTPS in production
    app.config['REMEMBER_COOKIE_HTTPONLY'] = True
    app.config['REMEMBER_COOKIE_SECURE'] = is_production
    
    # CORS origins from environment
    cors_origins_str = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000,http://localhost:8080')
    cors_origins = [o.strip() for o in cors_origins_str.split(',') if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    # Initialize SocketIO with CORS support
    socketio.init_app(
        app, 
        cors_allowed_origins=cors_origins,
        manage_session=False,
        async_mode='eventlet'
    )
    
    # Register socket event handlers
    from app.socket_events import register_socket_events
    register_socket_events(socketio)

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Unauthorized'}), 401

    # Register Blueprints
    from app.routes import common, admin, referee, captain, fixtures, chat, friendly
    from app.auth import auth
    
    # All API routes under /api prefix
    app.register_blueprint(common, url_prefix='/api')
    app.register_blueprint(admin, url_prefix='/api')
    app.register_blueprint(referee, url_prefix='/api')
    app.register_blueprint(captain, url_prefix='/api')
    app.register_blueprint(fixtures, url_prefix='/api')
    app.register_blueprint(chat, url_prefix='/api')
    app.register_blueprint(friendly, url_prefix='/api')
    app.register_blueprint(auth, url_prefix='/api/auth')

    from app.models import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Global error handlers to always return JSON
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

    # ----------------------------
    # Serve frontend static files in production
    # ----------------------------
    dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dist')
    
    if os.path.isdir(dist_dir):
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            # Don't intercept API routes
            if path.startswith('api/') or path.startswith('socket.io'):
                return jsonify({'error': 'Not found'}), 404
            
            # Try to serve the exact file (JS, CSS, images, etc.)
            full_path = os.path.join(dist_dir, path)
            if path and os.path.isfile(full_path):
                return send_from_directory(dist_dir, path)
            
            # For everything else, serve index.html (SPA routing)
            return send_from_directory(dist_dir, 'index.html')

    return app
