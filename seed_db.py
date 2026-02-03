from app import create_app, db
from app.models import User, Division, Team
from app.utils.scheduler import RoundRobinScheduler
from datetime import datetime, timedelta

app = create_app()

def seed_db():
    with app.app_context():
        # Reset DB
        db.drop_all()
        db.create_all()
        
        print("Creating Users...")
        # Create Verify Admin
        admin = User(username='admin', role='admin', name='Admin User')
        admin.set_password('password')
        db.session.add(admin)
        
        db.session.commit()
        print("Database seeded! Default admin created (admin/password).")

if __name__ == '__main__':
    seed_db()
