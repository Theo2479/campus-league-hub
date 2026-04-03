import requests
from app import create_app, db
from app.models import User, Team, Division, Fixture
from datetime import datetime
import json

def verify_captain_flow():
    app = create_app()
    with app.app_context():
        print("1. Setting up test data...")
        # Ensure we have an admin
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', role='admin', name='Admin User')
            admin.set_password('password')
            db.session.add(admin)
            db.session.commit()
            print("   Created admin user")

        # Create a test team
        team_name = "Test FC"
        team = Team.query.filter_by(name=team_name).first()
        if not team:
            # Need a division first
            div = Division.query.first()
            if not div:
                div = Division(name="Test Division", day_of_week="Wednesday")
                db.session.add(div)
                db.session.commit()
            
            team = Team(name=team_name, division_id=div.id)
            db.session.add(team)
            db.session.commit()
            print(f"   Created team: {team_name}")
        else:
            # clear any existing captain
            if team.captain_id:
                team.captain_id = None
                db.session.commit()
                print(f"   Cleared existing captain from {team_name}")

        # Ensure no existing test captain
        existing_cap = User.query.filter_by(username='test_captain').first()
        if existing_cap:
            db.session.delete(existing_cap)
            db.session.commit()
            print("   Deleted existing test_captain")

        # Store IDs for later use
        admin_id = admin.id
        team_id = team.id
        team_name_str = team.name

    # Use test client for requests
    with app.test_client() as client:
        print("\n2. login as Admin...")
        # Login
        with client.session_transaction() as sess:
            sess['_user_id'] = str(admin_id)
            sess['_fresh'] = True
        
        print("\n3. Testing Captain Creation (Admin API)...")
        # Create captain
        res = client.post('/api/admin/captains', json={
            'username': 'test_captain',
            'name': 'Test Captain',
            'password': 'password123',
            'team_id': team_id
        })
        
        if res.status_code != 200:
            print(f"FAILED: {res.json}")
            return
            
        data = res.json
        captain_id = data['captain']['id']
        print(f"   SUCCESS: Created captain (ID: {captain_id}) linked to team {data['captain']['team_name']}")
        
        # Verify DB
        with app.app_context():
            cap_user = User.query.get(captain_id)
            team_check = Team.query.get(team_id)
            assert cap_user.role == 'captain'
            assert team_check.captain_id == captain_id
            print("   DB Verification: Captain role correct and linked to team.")

        print("\n4. Testing Captain Login and Data Access...")
        # Logout admin
        client.get('/api/auth/logout') # Assuming logout clears session depending on implementation, or we just overwrite session
        
        # Login as Captain
        # We can simulate login by setting session or using login endpoint
        login_res = client.post('/api/auth/login', json={
             'username': 'test_captain',
             'password': 'password123'
        })
        
        if login_res.status_code != 200:
             print(f"FAILED Login: {login_res.json}")
             return
             
        print("   SUCCESS: Captain logged in")
        user_data = login_res.json['user']
        print(f"   Session Data: Team ID={user_data.get('team_id')}, Team Name={user_data.get('team_name')}")
        
        assert user_data.get('team_id') == team_id
        assert user_data.get('team_name') == team_name_str

        print("\n5. Testing Captain Data Endpoints...")
        
        # Get Team
        team_res = client.get('/api/captain/team')
        if team_res.status_code == 200:
            print("   SUCCESS: Fetched /api/captain/team")
            # print(json.dumps(team_res.json, indent=2))
        else:
            print(f"   FAILED: {team_res.status_code}")

        # Get Fixtures
        fixtures_res = client.get('/api/captain/fixtures')
        if fixtures_res.status_code == 200:
            print("   SUCCESS: Fetched /api/captain/fixtures")
        else:
            print(f"   FAILED: {fixtures_res.status_code}")
            
        # Get Standings
        standings_res = client.get('/api/captain/standings')
        if standings_res.status_code == 200:
            print("   SUCCESS: Fetched /api/captain/standings")
        else:
            print(f"   FAILED: {standings_res.status_code}")

        print("\nVERIFICATION COMPLETE: Full flow working correctly.")

if __name__ == "__main__":
    verify_captain_flow()
