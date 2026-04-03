
from app import create_app, db
from app.models import Fixture, Division, Pitch, PitchAvailability, Team
from app.utils.scheduler import RoundRobinScheduler
from datetime import datetime, timedelta

app = create_app()

def verify_scheduling():
    with app.app_context():
        print("--- Setting up Test Data ---")
        # 1. Clean up fixtures/availability/pitches to ensure isolation
        Fixture.query.delete()
        PitchAvailability.query.delete()
        Pitch.query.delete()
        db.session.commit()

        # 2. Create a Pitch
        pitch = Pitch(name="Test Field A")
        db.session.add(pitch)
        db.session.commit()
        print(f"Created Pitch: {pitch.name} (ID: {pitch.id})")

        # 3. Create Availability for Wednesday
        # Assuming the scheduler starts on a Wednesday
        avail = PitchAvailability(
            pitch_id=pitch.id,
            day_of_week="Wednesday", 
            time_slot="14:00"
        )
        db.session.add(avail)
        db.session.commit()
        print(f"Created Availability: {avail.day_of_week} at {avail.time_slot}")

        # 4. Get Division (assuming seeded)
        div = Division.query.first()
        if not div:
            print("ERROR: No division found. Run scripts/seed_db.py first.")
            return

        print(f"Using Division: {div.name} with {div.teams.count()} teams")

        # 5. Run Scheduler
        print("--- Running Scheduler ---")
        # Ensure start date is a Wednesday
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        while start_date.strftime("%A") != "Wednesday":
            start_date += timedelta(days=1)
        
        print(f"Scheduling start date: {start_date.strftime('%Y-%m-%d (%A)')}")
        
        scheduler = RoundRobinScheduler(div, start_date)
        fixtures = scheduler.generate_fixtures()

        print(f"Generated {len(fixtures)} fixtures.")

        # 6. Verify first fixture configuration

        # 6. Save FIRST batch of fixtures (simulating Div 1 generation)
        print("Saving Div 1 fixtures...")
        for f in fixtures:
            db.session.add(f)
        db.session.commit()

        # 7. Create SECOND Division and Team
        print("--- Creating Division 2 ---")
        div2 = Division(name="Wednesday League 2", day_of_week="Wednesday")
        db.session.add(div2)
        db.session.commit()
        
        team_z = Team(name="Div2 Team Z", division_id=div2.id)
        team_y = Team(name="Div2 Team Y", division_id=div2.id)
        db.session.add(team_z)
        db.session.add(team_y)
        db.session.commit()
        
        # 8. Run Scheduler for Division 2
        print("--- Running Scheduler for Division 2 ---")
        scheduler2 = RoundRobinScheduler(div2, start_date)
        fixtures2 = scheduler2.generate_fixtures()
        
        print(f"Generated {len(fixtures2)} fixtures for Div 2.")
        
        if not fixtures2:
            print("ERROR: No fixtures for Div 2")
            return

        f2 = fixtures2[0]
        print(f"Div 2 Fixture ID: {f2.id} (Home ID: {f2.home_team_id} vs Away ID: {f2.away_team_id})")
        print(f"  > Pitch: '{f2.pitch}'")
        print(f"  > Time: '{f2.time_slot}'")
        
        # Div 1 took "Test Field A" @ "14:00". 
        # Div 2 should NOT get it. It should get overflow or another slot (if we added one).
        # We only added ONE slot (14:00). So Div 2 should fall back to Overflow.
        
        if f2.pitch == "Test Field A" and f2.time_slot == "14:00":
             print("FAILURE: Double Booking detected! Conflict logic failed.")
        elif "Overflow" in f2.pitch:
             print("SUCCESS: Scheduler detected conflict and pushed Div 2 to Overflow.")
        else:
             print(f"NOTE: Assigned to {f2.pitch} @ {f2.time_slot} (Unexpected but maybe valid if new slots added?)")

if __name__ == "__main__":
    verify_scheduling()
