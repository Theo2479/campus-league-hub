"""
Admin routes — tournament management.
"""
from flask import jsonify, request
from flask_login import login_required
from app import db
from app.models import Team, Fixture, Tournament, tournament_teams, PitchAvailability, Pitch
from app.utils.decorators import require_role
import logging
import random
from datetime import datetime, timedelta

from app.routes.admin import admin

logger = logging.getLogger(__name__)


@admin.route('/admin/tournaments', methods=['GET'])
@login_required
@require_role('admin')
def list_tournaments():
    """List all tournaments with their teams and fixtures."""
    tournaments = Tournament.query.order_by(Tournament.created_at.desc()).all()
    result = []
    for t in tournaments:
        team_ids = db.session.execute(
            tournament_teams.select().where(tournament_teams.c.tournament_id == t.id)
        ).fetchall()
        teams = []
        for row in team_ids:
            team = Team.query.get(row.team_id)
            if team:
                teams.append({'id': team.id, 'name': team.name})

        fixtures = [f.to_dict() for f in t.fixtures.order_by(Fixture.match_order).all()]

        rounds = {}
        for f in fixtures:
            rn = f.get('round_name', 'Unknown')
            if rn not in rounds:
                rounds[rn] = []
            rounds[rn].append(f)

        result.append({
            **t.to_dict(),
            'teams': teams,
            'fixtures': fixtures,
            'rounds': rounds
        })

    return jsonify({'tournaments': result})


@admin.route('/admin/tournaments', methods=['POST'])
@login_required
@require_role('admin')
def create_tournament():
    """Create a new tournament."""
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Tournament name is required'}), 400

    tournament = Tournament(name=name, format='knockout', status='setup')
    db.session.add(tournament)
    db.session.commit()

    return jsonify({'message': f'Tournament "{name}" created', 'tournament': tournament.to_dict()}), 201


@admin.route('/admin/tournaments/<int:tid>/teams', methods=['POST'])
@login_required
@require_role('admin')
def assign_tournament_teams(tid):
    """Assign teams to a tournament."""
    tournament = Tournament.query.get_or_404(tid)
    data = request.get_json()
    team_ids = data.get('teamIds', [])

    if len(team_ids) < 2:
        return jsonify({'error': 'At least 2 teams required'}), 400

    db.session.execute(tournament_teams.delete().where(tournament_teams.c.tournament_id == tid))

    for team_id in team_ids:
        db.session.execute(tournament_teams.insert().values(tournament_id=tid, team_id=int(team_id)))

    db.session.commit()
    return jsonify({'message': f'{len(team_ids)} teams assigned'})


@admin.route('/admin/tournaments/<int:tid>/generate', methods=['POST'])
@login_required
@require_role('admin')
def generate_knockout_bracket(tid):
    """Generate knockout bracket fixtures with bye support."""
    tournament = Tournament.query.get_or_404(tid)

    data = request.get_json()
    start_date_str = data.get('startDate')
    default_time_slot = data.get('timeSlot', '15:00')
    bye_team_ids = data.get('byeTeamIds', [])

    if not start_date_str:
        return jsonify({'error': 'Start date is required'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    rows = db.session.execute(
        tournament_teams.select().where(tournament_teams.c.tournament_id == tid)
    ).fetchall()
    all_team_ids = [r.team_id for r in rows]

    if len(all_team_ids) < 2:
        return jsonify({'error': 'At least 2 teams must be assigned'}), 400

    Fixture.query.filter_by(tournament_id=tid).delete()

    bye_ids_set = set(int(b) for b in bye_team_ids)
    playing = [t_id for t_id in all_team_ids if t_id not in bye_ids_set]
    byes = [t_id for t_id in all_team_ids if t_id in bye_ids_set]

    total = len(all_team_ids)
    round_names = []
    if total <= 2:
        round_names = ['Final']
    elif total <= 4:
        round_names = ['Semi-Final', 'Final']
    elif total <= 8:
        round_names = ['Quarter-Final', 'Semi-Final', 'Final']
    elif total <= 16:
        round_names = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
    else:
        round_names = ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']

    fixtures_created = []
    match_order = 1
    current_date = start_date

    pairs = []
    for i in range(0, len(playing) - 1, 2):
        pairs.append((playing[i], playing[i + 1]))

    pair_idx = 0
    weeks_checked = 0

    while pair_idx < len(pairs):
        all_slots = PitchAvailability.query.filter_by(date=current_date.date()).all()

        existing_fixtures = Fixture.query.filter(
            Fixture.date == current_date,
            Fixture.status != 'cancelled'
        ).all()

        busy = set()
        for ef in existing_fixtures:
            if ef.pitch and ef.time_slot:
                busy.add((ef.pitch, ef.time_slot))

        valid_slots = []
        for slot in all_slots:
            pitch = Pitch.query.get(slot.pitch_id)
            if pitch and (pitch.name, slot.time_slot) not in busy:
                valid_slots.append({'pitch': pitch, 'time': slot.time_slot})

        if len(valid_slots) == 0:
            if weeks_checked > 10:
                for i in range(pair_idx, len(pairs)):
                    home, away = pairs[i]
                    fixture = Fixture(
                        home_team_id=home,
                        away_team_id=away,
                        tournament_id=tid,
                        round_name=round_names[0],
                        match_order=match_order,
                        date=current_date,
                        time_slot=default_time_slot,
                        pitch="Unassigned (No more slots)",
                        status='scheduled'
                    )
                    db.session.add(fixture)
                    fixtures_created.append(fixture)
                    match_order += 1
                break
            else:
                current_date += timedelta(weeks=1)
                weeks_checked += 1
                continue

        random.shuffle(valid_slots)

        for slot in valid_slots:
            if pair_idx >= len(pairs):
                break

            home, away = pairs[pair_idx]
            fixture = Fixture(
                home_team_id=home,
                away_team_id=away,
                tournament_id=tid,
                round_name=round_names[0],
                match_order=match_order,
                date=current_date,
                time_slot=slot['time'],
                pitch=slot['pitch'].name,
                status='scheduled'
            )
            db.session.add(fixture)
            fixtures_created.append(fixture)
            match_order += 1
            pair_idx += 1

        if pair_idx < len(pairs):
            current_date += timedelta(weeks=1)
            weeks_checked += 1

    if len(playing) % 2 == 1:
        byes.append(playing[-1])

    tournament.status = 'in_progress'
    db.session.commit()

    return jsonify({
        'message': f'Knockout bracket generated: {len(fixtures_created)} matches in {round_names[0]}',
        'fixtures': [f.to_dict() for f in fixtures_created],
        'bye_teams': [Team.query.get(b).name for b in byes if Team.query.get(b)],
        'rounds': round_names
    })


@admin.route('/admin/tournaments/<int:tid>/advance', methods=['POST'])
@login_required
@require_role('admin')
def advance_tournament_round(tid):
    """Advance completed round winners to the next round."""
    tournament = Tournament.query.get_or_404(tid)
    data = request.get_json()
    next_round_name = data.get('nextRound')
    next_date_str = data.get('date')
    default_time_slot = data.get('timeSlot', '15:00')

    if not next_round_name or not next_date_str:
        return jsonify({'error': 'Next round name and date required'}), 400

    try:
        next_date = datetime.strptime(next_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    current_round_name = data.get('currentRound')
    if not current_round_name:
        all_rounds = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
        if next_round_name in all_rounds:
            idx = all_rounds.index(next_round_name)
            if idx > 0:
                current_round_name = all_rounds[idx - 1]
        else:
            latest_f = Fixture.query.filter_by(tournament_id=tid).order_by(Fixture.id.desc()).first()
            if latest_f:
                current_round_name = latest_f.round_name
                
    if not current_round_name:
        return jsonify({'error': 'Could not determine current round to advance from'}), 400

    current_fixtures = Fixture.query.filter_by(
        tournament_id=tid, status='completed', round_name=current_round_name
    ).order_by(Fixture.match_order).all()

    existing_next = Fixture.query.filter_by(tournament_id=tid, round_name=next_round_name).count()
    if existing_next > 0:
        return jsonify({'error': f'{next_round_name} fixtures already exist'}), 400

    winners = []
    for f in current_fixtures:
        if f.home_score is not None and f.away_score is not None:
            if f.home_score > f.away_score:
                winners.append(f.home_team_id)
            elif f.away_score > f.home_score:
                winners.append(f.away_team_id)

    bye_team_ids = data.get('byeTeamIds', [])
    for b in bye_team_ids:
        winners.append(int(b))

    if len(winners) < 2:
        return jsonify({'error': 'Not enough winners to create next round'}), 400

    fixtures_created = []
    match_order = 1
    current_date = next_date

    pairs = []
    for i in range(0, len(winners) - 1, 2):
        pairs.append((winners[i], winners[i + 1]))

    pair_idx = 0
    weeks_checked = 0

    while pair_idx < len(pairs):
        all_slots = PitchAvailability.query.filter_by(date=current_date.date()).all()

        existing_fixtures = Fixture.query.filter(
            Fixture.date == current_date,
            Fixture.status != 'cancelled'
        ).all()

        busy = set()
        for ef in existing_fixtures:
            if ef.pitch and ef.time_slot:
                busy.add((ef.pitch, ef.time_slot))

        valid_slots = []
        for slot in all_slots:
            pitch = Pitch.query.get(slot.pitch_id)
            if pitch and (pitch.name, slot.time_slot) not in busy:
                valid_slots.append({'pitch': pitch, 'time': slot.time_slot})

        if len(valid_slots) == 0:
            if weeks_checked > 10:
                for i in range(pair_idx, len(pairs)):
                    home, away = pairs[i]
                    fixture = Fixture(
                        home_team_id=home,
                        away_team_id=away,
                        tournament_id=tid,
                        round_name=next_round_name,
                        match_order=match_order,
                        date=current_date,
                        time_slot=default_time_slot,
                        pitch="Unassigned (No more slots)",
                        status='scheduled'
                    )
                    db.session.add(fixture)
                    fixtures_created.append(fixture)
                    match_order += 1
                break
            else:
                current_date += timedelta(weeks=1)
                weeks_checked += 1
                continue

        random.shuffle(valid_slots)

        for slot in valid_slots:
            if pair_idx >= len(pairs):
                break

            home, away = pairs[pair_idx]
            fixture = Fixture(
                home_team_id=home,
                away_team_id=away,
                tournament_id=tid,
                round_name=next_round_name,
                match_order=match_order,
                date=current_date,
                time_slot=slot['time'],
                pitch=slot['pitch'].name,
                status='scheduled'
            )
            db.session.add(fixture)
            fixtures_created.append(fixture)
            match_order += 1
            pair_idx += 1

        if pair_idx < len(pairs):
            current_date += timedelta(weeks=1)
            weeks_checked += 1

    db.session.commit()
    return jsonify({
        'message': f'{len(fixtures_created)} matches created for {next_round_name}',
        'fixtures': [f.to_dict() for f in fixtures_created]
    })


@admin.route('/admin/tournaments/<int:tid>', methods=['DELETE'])
@login_required
@require_role('admin')
def delete_tournament(tid):
    """Delete a tournament and all its fixtures, including associated chats."""
    tournament = Tournament.query.get_or_404(tid)
    from app.models import ChatChannel

    fixture_ids = [f.id for f in tournament.fixtures.all()]

    if fixture_ids:
        ChatChannel.query.filter(ChatChannel.fixture_id.in_(fixture_ids)).delete(synchronize_session=False)

    Fixture.query.filter_by(tournament_id=tid).delete(synchronize_session=False)

    db.session.execute(tournament_teams.delete().where(tournament_teams.c.tournament_id == tid))

    db.session.delete(tournament)
    db.session.commit()

    return jsonify({'message': f'Tournament "{tournament.name}" deleted'})
