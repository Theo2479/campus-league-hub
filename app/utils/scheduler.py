from datetime import datetime, timedelta
from app.models import Fixture, Team

# Day name to weekday number mapping (Monday=0, Sunday=6)
DAY_TO_WEEKDAY = {
    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
    'friday': 4, 'saturday': 5, 'sunday': 6
}

class RoundRobinScheduler:
    def __init__(self, division, start_date, games_per_week=None):
        """
        Initialize the scheduler.
        
        Args:
            division: The Division object
            start_date: Starting date for fixtures
            games_per_week: Number of games per week (None or 0 = all games possible)
        """
        self.division = division
        self.teams = list(division.teams)
        self.start_date = start_date
        self.games_per_week = games_per_week  # None means all games
        
        # Get the day of week this division plays on
        self.division_day = division.day_of_week.lower() if division.day_of_week else 'wednesday'
        self.target_weekday = DAY_TO_WEEKDAY.get(self.division_day, 2)  # Default Wednesday

    def _find_next_matching_day(self, from_date):
        """Find the next date that matches the division's day of week."""
        # Handle both datetime and date objects
        if hasattr(from_date, 'date'):
            current = from_date.date()
        else:
            current = from_date
            
        # If from_date is already the target day, use it
        if current.weekday() == self.target_weekday:
            return current
            
        # Otherwise find the next occurrence
        days_ahead = self.target_weekday - current.weekday()
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7
        return current + timedelta(days=days_ahead)

    def generate_fixtures(self):
        """
        Generates a round-robin schedule using available pitch slots.
        Only uses slots on dates that match the division's day_of_week.
        Returns a list of Fixture objects (not committed to DB).
        """
        from app.models import PitchAvailability, Pitch, Fixture

        if len(self.teams) % 2 != 0:
            self.teams.append(None)

        num_teams = len(self.teams)
        num_rounds = num_teams - 1
        half_size = num_teams // 2
        
        # Calculate matches per round
        matches_per_round = half_size if None not in self.teams else half_size
        
        # If games_per_week is set, cap the matches
        max_games_this_round = matches_per_round
        if self.games_per_week and self.games_per_week > 0:
            max_games_this_round = min(self.games_per_week, matches_per_round)
        
        fixtures = []
        indices = list(range(num_teams))
        
        # Start from the first date matching the division's day
        current_date = self._find_next_matching_day(self.start_date)

        for round_num in range(num_rounds):
            # 1. Get available slots for this specific date
            # The date MUST match the division's day of week
            all_slots = PitchAvailability.query.filter_by(date=current_date).all()
            all_slots.sort(key=lambda x: x.time_slot)
            
            # Verify the date matches the division's day (double check)
            if current_date.weekday() != self.target_weekday:
                # Skip this week if date doesn't match - should not happen with _find_next_matching_day
                current_date += timedelta(weeks=1)
                continue
            
            # 2. Filter out slots that are already taken by EXISTING fixtures
            existing_fixtures = Fixture.query.filter(
                Fixture.date == current_date,
                Fixture.status != 'cancelled'
            ).all()
            
            busy_signatures = set()
            for ef in existing_fixtures:
                if ef.pitch and ef.time_slot:
                    busy_signatures.add((ef.pitch, ef.time_slot))
            
            available_slots = []
            for slot in all_slots:
                pitch = Pitch.query.get(slot.pitch_id)
                if not pitch: 
                    continue
                
                # Check if this specific slot is busy
                if (pitch.name, slot.time_slot) not in busy_signatures:
                    available_slots.append({'pitch': pitch, 'time': slot.time_slot})
            
            slot_index = 0
            games_scheduled_this_round = 0
            
            # 3. Pair teams
            for i in range(half_size):
                # Check games per week limit
                if self.games_per_week and self.games_per_week > 0:
                    if games_scheduled_this_round >= self.games_per_week:
                        break
                
                t1_idx = indices[i]
                t2_idx = indices[num_teams - 1 - i]
                
                team1 = self.teams[t1_idx]
                team2 = self.teams[t2_idx]

                if team1 and team2:
                    # Allocate a slot
                    if slot_index < len(available_slots):
                        slot_data = available_slots[slot_index]
                        venue = slot_data['pitch'].name
                        time = slot_data['time']
                        slot_index += 1
                    else:
                        # Overflow / Fallback - no slots available for this division's day
                        venue = "Unassigned / No slots on " + self.division_day.capitalize()
                        time = "TBD"
                    
                    fixture = Fixture(
                        home_team_id=team1.id,
                        away_team_id=team2.id,
                        date=current_date,
                        time_slot=time,
                        pitch=venue,
                        status='scheduled'
                    )
                    fixtures.append(fixture)
                    games_scheduled_this_round += 1

            indices = [indices[0]] + [indices[-1]] + indices[1:-1]
            current_date += timedelta(weeks=1)
            
        return fixtures

import random

class LeagueRoundRobinScheduler:
    def __init__(self, league, start_date, games_per_week=None):
        self.league = league
        self.start_date = start_date
        self.games_per_week = games_per_week
        # Assuming league has a default day.
        self.league_day = league.default_day.lower() if league.default_day else 'wednesday'
        self.target_weekday = DAY_TO_WEEKDAY.get(self.league_day, 2)

    def _find_next_matching_day(self, from_date):
        """Find the next date that matches the league's day of week."""
        if hasattr(from_date, 'date'):
            current = from_date.date()
        else:
            current = from_date
        if current.weekday() == self.target_weekday:
            return current
        days_ahead = self.target_weekday - current.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return current + timedelta(days=days_ahead)

    def generate_fixtures(self):
        from app.models import PitchAvailability, Pitch, Fixture
        
        all_generated_fixtures = []
        
        # 1. Generate Abstract Pairings for ALL divisions
        # Structure: schedule_by_week = { 0: [match1, match2...], 1: [...] }
        schedule_by_week = {}
        max_weeks = 0
        
        for division in self.league.divisions:
            teams = list(division.teams)
            if not teams or len(teams) < 2:
                continue
                
            if len(teams) % 2 != 0:
                teams.append(None) # Dummy for bye
                
            num_teams = len(teams)
            num_rounds = num_teams - 1
            half_size = num_teams // 2
            indices = list(range(num_teams))
            
            # Round Robin Rotation
            for round_num in range(num_rounds):
                if round_num not in schedule_by_week:
                    schedule_by_week[round_num] = []
                
                # Pair teams
                for i in range(half_size):
                    t1_idx = indices[i]
                    t2_idx = indices[num_teams - 1 - i]
                    
                    team1 = teams[t1_idx]
                    team2 = teams[t2_idx]
                    
                    if team1 and team2:
                        schedule_by_week[round_num].append({
                            'division': division,
                            'home': team1,
                            'away': team2
                        })
                
                # Rotate indices
                indices = [indices[0]] + [indices[-1]] + indices[1:-1]
                
            if num_rounds > max_weeks:
                max_weeks = num_rounds

        # 2. Assign Time/Pitch for each week
        current_date = self._find_next_matching_day(self.start_date)
        
        for week_num in range(max_weeks):
            matches = schedule_by_week.get(week_num, [])
            if not matches:
                current_date += timedelta(weeks=1)
                continue
                
            # Fetch slots for this date
            all_slots = PitchAvailability.query.filter_by(date=current_date).all()
            
            # Filter valid slots (exclude blocked/booked if any, though usually Availability IS the whitelist)
            valid_slots = []
            for slot in all_slots:
                pitch = Pitch.query.get(slot.pitch_id)
                if pitch:
                    valid_slots.append({'pitch': pitch, 'time': slot.time_slot})
            
            # RANDOMIZE SLOTS
            # This is the key requirement: "random across the available times and pitches"
            random.shuffle(valid_slots)
            
            # Assign matches to slots
            slot_idx = 0
            for match in matches:
                venue = "TBD"
                time = "TBD"
                
                if slot_idx < len(valid_slots):
                    slot_data = valid_slots[slot_idx]
                    venue = slot_data['pitch'].name
                    time = slot_data['time']
                    slot_idx += 1
                else:
                    venue = f"Unassigned (No Slot on {current_date})"
                
                fixture = Fixture(
                    home_team_id=match['home'].id,
                    away_team_id=match['away'].id,
                    date=current_date,
                    time_slot=time,
                    pitch=venue,
                    status='scheduled'
                )
                all_generated_fixtures.append(fixture)
            
            current_date += timedelta(weeks=1)
            
        return all_generated_fixtures
