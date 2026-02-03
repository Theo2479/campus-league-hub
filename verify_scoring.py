import requests
from app import create_app, db
from app.models import User, Fixture, Team, Division
from datetime import datetime, date

def verify_scoring():
    app = create_app()
    with app.app_context():
        # Setup
        # Create a referee if not exists
        ref = User.query.filter_by(username='ref_test').first()
        if not ref:
            ref = User(username='ref_test', role='referee', name='Test Ref')
            ref.set_password('password')
            db.session.add(ref)
            db.session.commit() # Commit to get ID
            print(f"Created referee: {ref.username} (ID: {ref.id})")
        else:
            print(f"Using existing referee: {ref.username} (ID: {ref.id})")

        # Create two teams
        div = Division.query.first()
        if not div:
            div = Division(name='Test Div', day_of_week='Monday')
            db.session.add(div)
            db.session.commit()
            
        team1 = Team.query.filter_by(name='Team A').first()
        if not team1:
            team1 = Team(name='Team A', division_id=div.id)
            db.session.add(team1)
        
        team2 = Team.query.filter_by(name='Team B').first()
        if not team2:
            team2 = Team(name='Team B', division_id=div.id)
            db.session.add(team2)
            
        db.session.commit()
        
        # Reset stats
        for t in [team1, team2]:
            t.played = 0
            t.won = 0
            t.drawn = 0
            t.lost = 0
            t.points = 0
            t.goals_for = 0
            t.goals_against = 0
        db.session.commit()

        # Create fixture
        fixture = Fixture(
            home_team_id=team1.id,
            away_team_id=team2.id,
            ref_id=ref.id,
            date=datetime.now(),
            time_slot="12:00",
            pitch="Pitch 1",
            status='scheduled'
        )
        db.session.add(fixture)
        db.session.commit()
        print(f"Created fixture: {fixture.id} ({team1.name} vs {team2.name})")

        # Test Scoring via API logic (simulated by calling route function or direct logic if simplified)
        # But here we want to test the full flow, so we will use requests against the running server if possible
        # Or simpler: we invoke the logic that will be in the route.
        
        # Let's write the route logic here to verify it works before pasting into routes.py, 
        # OR better: this script will run AFTER I implemented the route.
        # So I will assume the server is running on localhost:5001
        
        # Login
        session = requests.Session()
        # Since we use flask-login, we need to login via a route or use a test client.
        # Given this is an external script, real request is best.
        # BUT flask-login uses cookies/session. 
        # I'll use the test_client() from flask for easier testing without running server management.
        
        with app.test_client() as client:
            # Mock login
            with client.session_transaction() as sess:
                sess['_user_id'] = str(ref.id)
                sess['_fresh'] = True
                
            response = client.post(f'/api/fixtures/{fixture.id}/score', json={
                'home_score': 3,
                'away_score': 1
            })
            
            if response.status_code != 200:
                print(f"Error submitting score: {response.json}")
                return

            print("Score submitted successfully.")
            
            # Verify DB updates
            db.session.refresh(team1)
            db.session.refresh(team2)
            db.session.refresh(fixture)
            
            print(f"Fixture Status: {fixture.status}")
            print(f"Fixture Score: {fixture.home_score}-{fixture.away_score}")
            
            print(f"Team 1 Stats: P:{team1.played} W:{team1.won} D:{team1.drawn} L:{team1.lost} Pts:{team1.points} GF:{team1.goals_for} GA:{team1.goals_against}")
            
            assert fixture.status == 'completed'
            assert fixture.home_score == 3
            assert fixture.away_score == 1
            
            assert team1.points == 3
            assert team1.won == 1
            assert team1.goals_for == 3
            assert team1.goal_difference == 2
            
            assert team2.points == 0
            assert team2.lost == 1
            assert team2.goals_for == 1
            assert team2.goal_difference == -2
            
            print("VERIFICATION SUCCESSFUL!")

if __name__ == "__main__":
    verify_scoring()
