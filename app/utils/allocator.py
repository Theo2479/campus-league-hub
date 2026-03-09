from app import db
from app.models import Fixture, User, RefereeAvailability
from datetime import datetime, timedelta
from sqlalchemy import and_

def allocate_referees(start_date, end_date):
    """
    Allocates referees to fixtures between start_date and end_date.
    Uses an EQUITABLE distribution algorithm that:
    1. Prioritizes refs with fewer total assignments
    2. Prevents same-day/same-week overloading
    3. Gives bonus to refs inactive for 3+ weeks
    Only considers referees who have expressed availability for the fixture's slot.
    """
    # 1. Get unassigned fixtures in range
    fixtures = Fixture.query.filter(
        Fixture.date >= start_date,
        Fixture.date <= end_date,
        Fixture.ref_id == None,
        Fixture.status == 'scheduled'
    ).order_by(Fixture.date, Fixture.time_slot).all()

    # 2. Pre-calculate total completed + assigned games for each referee
    # This gives us a baseline for equity
    all_referees = User.query.filter_by(role='referee').all()
    ref_total_games = {}
    for ref in all_referees:
        # Count all games (completed + scheduled)
        total = Fixture.query.filter(Fixture.ref_id == ref.id).count()
        ref_total_games[ref.id] = total

    allocations = []
    
    for fixture in fixtures:
        try:
            fixture_time = datetime.strptime(fixture.time_slot, '%H:%M').time()
            fixture_dt = datetime.combine(fixture.date, fixture_time)
        except (ValueError, TypeError):
            # Skip if time_slot is invalid
            continue
            
        f_date = fixture.date.date() if hasattr(fixture.date, 'date') else fixture.date
        
        # Find available candidates for this specific slot
        avails = RefereeAvailability.query.filter_by(
            date=f_date,
            time_slot=fixture.time_slot
        ).all()
        
        candidates = []
        
        for avail in avails:
            ref = avail.user
            
            # HARD CONSTRAINT: Time Clash Check
            # Get all games this ref is assigned to on the same day
            same_day_games = Fixture.query.filter(
                Fixture.ref_id == ref.id,
                Fixture.date == fixture.date
            ).all()
            
            has_clash = False
            for game in same_day_games:
                try:
                    game_time = datetime.strptime(game.time_slot, '%H:%M').time()
                    game_dt = datetime.combine(game.date, game_time)
                    time_diff = abs((fixture_dt - game_dt).total_seconds() / 3600)
                    if time_diff < 1.5:  # 90 mins buffer
                        has_clash = True
                        break
                except (ValueError, TypeError):
                    continue
            
            if has_clash:
                continue
            
            # Calculate Equity Score (higher = better candidate)
            score = 100  # Base score
            
            # A. TOTAL GAMES PENALTY (most important for equity)
            # -20 per total game assigned - heavily penalizes refs who already have many games
            total_games = ref_total_games.get(ref.id, 0)
            score -= (total_games * 20)
            
            # B. WEEKLY BALANCE (-30 per game this week)
            # Prevents one ref getting multiple games in same week
            week_start = fixture.date - timedelta(days=fixture.date.weekday())
            week_end = week_start + timedelta(days=6)
            
            games_this_week = Fixture.query.filter(
                Fixture.ref_id == ref.id,
                Fixture.date >= week_start,
                Fixture.date <= week_end
            ).count()
            
            score -= (games_this_week * 30)
            
            # C. SAME DAY PENALTY (-50 if already has a game today)
            # Strongly discourages multiple games on same day
            games_today = Fixture.query.filter(
                Fixture.ref_id == ref.id,
                Fixture.date == fixture.date
            ).count()
            
            score -= (games_today * 50)
            
            # D. 3-WEEK INACTIVITY BONUS (+40 if no game in 21+ days)
            last_game = Fixture.query.filter(
                Fixture.ref_id == ref.id,
                Fixture.date < fixture.date
            ).order_by(Fixture.date.desc()).first()
            
            if not last_game:
                score += 40  # Never reffed before - give priority
            else:
                last_date = last_game.date.date() if hasattr(last_game.date, 'date') else last_game.date
                curr_date = fixture.date.date() if hasattr(fixture.date, 'date') else fixture.date
                days_since = (curr_date - last_date).days
                if days_since > 21:
                    score += 40
                elif days_since > 14:
                    score += 20
                elif days_since > 7:
                    score += 10
            
            candidates.append({'ref': ref, 'score': score, 'total_games': total_games})
        
        # Sort candidates by score desc, then by total_games asc (as tiebreaker)
        candidates.sort(key=lambda x: (x['score'], -x['total_games']), reverse=True)
        
        if candidates:
            best_match = candidates[0]['ref']
            fixture.ref_id = best_match.id
            
            # Update our tracking dict for next iterations
            ref_total_games[best_match.id] = ref_total_games.get(best_match.id, 0) + 1
            
            allocations.append({
                'fixture_id': fixture.id,
                'fixture': f"{fixture.home_team.name if fixture.home_team else 'TBD'} vs {fixture.away_team.name if fixture.away_team else 'TBD'}",
                'date': fixture.date.isoformat(),
                'time': fixture.time_slot,
                'referee': best_match.name,
                'score': candidates[0]['score']
            })
            # Commit immediately so this assignment counts for the next iteration's constraints
            db.session.commit()
            
    return allocations
