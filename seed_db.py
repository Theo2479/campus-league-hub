from app import create_app, db
from app.models import User, Division, Team
from app.utils.scheduler import RoundRobinScheduler
from datetime import datetime, timedelta
import os

app = create_app()

def seed_db():
    is_prod = os.environ.get('FLASK_ENV') == 'production'
    with app.app_context():
        if not is_prod:
            print("Development mode: Resetting database...")
            db.drop_all()
            db.create_all()
        else:
            print("Production mode: Skipping drop_all(). Assuming tables exist.")
        
        print("Checking/Creating Admin User...")
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', role='admin', name='Admin User')
            admin.set_password('password')
            db.session.add(admin)
            db.session.commit()
            print("Database seeded! Default admin created (admin/password).")
        else:
            print("Admin user already exists!")

if __name__ == '__main__':
    seed_db()
