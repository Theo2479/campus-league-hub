import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:5001'

def login(username, password):
    session = requests.Session()
    response = session.post(f'{BASE_URL}/api/auth/login', json={
        'username': username,
        'password': password
    })
    if response.status_code != 200:
        print(f"Login failed for {username}: {response.text}")
        return None
    return session

def verify_flow():
    # 1. Login as Referee
    print("Logging in as referee...")
    ref_session = login('ref1', 'password')
    if not ref_session: return

    # 2. Get Available Fixtures
    print("Fetching available fixtures...")
    response = ref_session.get(f'{BASE_URL}/api/fixtures/available')
    if response.status_code != 200:
        print(f"Failed to get fixtures: {response.text}")
        return
    
    fixtures = response.json()['fixtures']
    if not fixtures:
        print("No available fixtures found.")
        return

    target_fixture = fixtures[0]
    fixture_id = target_fixture['id']
    print(f"Targeting fixture: {target_fixture['home_team']} vs {target_fixture['away_team']} (ID: {fixture_id})")

    # 3. Express Interest
    print("Expressing interest...")
    response = ref_session.post(f'{BASE_URL}/api/fixtures/{fixture_id}/signup')
    if response.status_code != 200:
        # It might be "Already interested" which is fine
        print(f"Interest response: {response.json()}")
    else:
        print("Interest expressed successfully.")

    # 4. Login as Admin
    print("Logging in as admin...")
    admin_session = login('admin', 'password')
    if not admin_session: return

    # 5. Check Interest Count
    print("Checking interest count as admin...")
    response = admin_session.get(f'{BASE_URL}/api/fixtures')
    if response.status_code != 200:
        print(f"Failed to get admin fixtures: {response.text}")
        return
    
    admin_fixtures = response.json()['fixtures']
    target_admin_fixture = next((f for f in admin_fixtures if f['id'] == fixture_id), None)
    
    if target_admin_fixture:
        print(f"Interest count for fixture {fixture_id}: {target_admin_fixture.get('interest_count')}")
        if target_admin_fixture.get('interest_count', 0) > 0:
            print("SUCCESS: Interest count is visible to admin.")
        else:
            print("FAILURE: Interest count is 0.")
    else:
        print("Fixture not found in admin list.")

    # 6. Run Allocation
    print("Running allocation...")
    # Use a wide date range to ensure we catch the fixture
    start_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    
    response = admin_session.post(f'{BASE_URL}/api/admin/allocate', json={
        'startDate': start_date,
        'endDate': end_date
    })
    
    if response.status_code == 200:
        allocations = response.json().get('allocations', [])
        print(f"Allocation successful. Allocated {len(allocations)} fixtures.")
        allocated_fixture = next((a for a in allocations if a['fixture_id'] == fixture_id), None)
        if allocated_fixture:
            print(f"SUCCESS: Target fixture allocated to {allocated_fixture['referee']}")
        else:
            print("WARNING: Target fixture was NOT allocated (might be due to constraints).")
    else:
        print(f"Allocation failed: {response.text}")

if __name__ == '__main__':
    verify_flow()
