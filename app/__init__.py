from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
import os

db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production' # TODO: Use env var
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///league.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Session cookie config - use Lax for same-origin (via Vite proxy)
    # Set domain to 'localhost' to work across ports
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    # app.config['SESSION_COOKIE_DOMAIN'] = 'localhost'
    
    # CORS is still needed for direct API access during testing
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"]}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Unauthorized'}), 401

    # Register Blueprints
    from app.routes import main
    from app.auth import auth
    app.register_blueprint(main, url_prefix='/api')
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

    return app
