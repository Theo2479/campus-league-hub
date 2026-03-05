from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), nullable=False) # 'admin', 'referee', 'captain'
    name = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    
    # Relationships
    captain_of = db.relationship('Team', backref='captain', uselist=False)
    reffed_games = db.relationship('Fixture', backref='referee', lazy='dynamic')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'name': self.name
        }

class League(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, unique=True)
    default_day = db.Column(db.String(20), default='Wednesday')
    divisions = db.relationship('Division', backref='league', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'default_day': self.default_day
        }

class Division(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False) # e.g., "Wednesday League 1"
    day_of_week = db.Column(db.String(20), nullable=False) # "Wednesday"
    tier = db.Column(db.Integer, default=1)
    league_id = db.Column(db.Integer, db.ForeignKey('league.id'), nullable=True)
    teams = db.relationship('Team', backref='division', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'day_of_week': self.day_of_week,
            'tier': self.tier
        }

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    goals = db.Column(db.Integer, default=0)
    assists = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'team_id': self.team_id,
            'goals': self.goals,
            'assists': self.assists
        }

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    captain_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    division_id = db.Column(db.Integer, db.ForeignKey('division.id'))
    
    # Stats (JSON or simple columns)
    played = db.Column(db.Integer, default=0)
    won = db.Column(db.Integer, default=0)
    drawn = db.Column(db.Integer, default=0)
    lost = db.Column(db.Integer, default=0)
    points = db.Column(db.Integer, default=0)
    goals_for = db.Column(db.Integer, default=0)
    goals_against = db.Column(db.Integer, default=0)
    pitch_quality_score = db.Column(db.Float, default=0.0) # For balancing
    
    players = db.relationship('Player', backref='team', lazy='dynamic')

    @property
    def goal_difference(self):
        return self.goals_for - self.goals_against

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'captain_id': self.captain_id,
            'division_id': self.division_id,
            'players': [p.to_dict() for p in self.players],
            'stats': {
                'played': self.played,
                'won': self.won,
                'drawn': self.drawn,
                'lost': self.lost,
                'points': self.points,
                'goals_for': self.goals_for,
                'goals_against': self.goals_against,
                'goal_difference': self.goal_difference
            }
        }

class Fixture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    home_team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    away_team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    ref_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    date = db.Column(db.DateTime, nullable=False)
    time_slot = db.Column(db.String(20)) # e.g., "15:00"
    pitch = db.Column(db.String(64))
    
    status = db.Column(db.String(20), default='scheduled') # scheduled, completed, cancelled, postponed
    is_friendly = db.Column(db.Boolean, default=False)
    ref_dropped = db.Column(db.Boolean, default=False)  # True if a ref dropped out (shows as open game)
    
    home_score = db.Column(db.Integer, nullable=True)
    away_score = db.Column(db.Integer, nullable=True)

    # Relationships
    home_team = db.relationship('Team', foreign_keys=[home_team_id], backref='home_matches')
    away_team = db.relationship('Team', foreign_keys=[away_team_id], backref='away_matches')

    def to_dict(self):
        return {
            'id': self.id,
            'home_team': self.home_team.name,
            'away_team': self.away_team.name,
            'date': self.date.isoformat(),
            'time': self.time_slot,
            'venue': self.pitch,
            'status': self.status,
            'home_score': self.home_score,
            'away_score': self.away_score,
            'referee': self.referee.name if self.referee else None
        }

class RefereeAvailability(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time_slot = db.Column(db.String(20), nullable=False)
    
    user = db.relationship('User', backref=db.backref('availabilities', lazy='dynamic', cascade="all, delete-orphan"))

    __table_args__ = (db.UniqueConstraint('user_id', 'date', 'time_slot', name='unique_ref_availability'),)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.isoformat(),
            'time_slot': self.time_slot
        }

class Pitch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    # status could be 'active', 'maintenance'
    status = db.Column(db.String(20), default='active') 
    
    availabilities = db.relationship('PitchAvailability', backref='pitch', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'status': self.status
        }

class PitchAvailability(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pitch_id = db.Column(db.Integer, db.ForeignKey('pitch.id'), nullable=False)
    # Changed from day_of_week to specific date for per-week flexibility
    date = db.Column(db.Date, nullable=False)
    time_slot = db.Column(db.String(20), nullable=False)  # e.g. "15:00"
    
    def to_dict(self):
        return {
            'id': self.id,
            'pitch_id': self.pitch_id,
            'date': self.date.isoformat() if self.date else None,
            'day_of_week': self.date.strftime("%A") if self.date else None,
            'time_slot': self.time_slot
        }

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='info') # urgent, info, success
    read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'read': self.read,
            'timestamp': self.timestamp.isoformat()
        }

class PostponementRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fixture_id = db.Column(db.Integer, db.ForeignKey('fixture.id'), nullable=False)
    requester_team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending') # pending, approved, denied
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    fixture = db.relationship('Fixture', backref='postponement_requests')
    requester_team = db.relationship('Team', backref='postponement_requests')
    
    def to_dict(self):
        return {
            'id': self.id,
            'teamName': self.requester_team.name,
            'fixture': f"{self.fixture.home_team.name} vs {self.fixture.away_team.name}",
            'reason': self.reason,
            'status': self.status,
            'submittedAt': self.submitted_at.isoformat(),
            'requestedDate': self.fixture.date.isoformat(), # Just showing original date for now contexts
            'fixture_id': self.fixture_id
        }

class SystemSetting(db.Model):
    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(255))

class ChatChannel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100)) # Optional, e.g., "TEAM A vs TEAM B"
    type = db.Column(db.String(20)) # 'direct', 'game', 'announcement'
    fixture_id = db.Column(db.Integer, db.ForeignKey('fixture.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    participants = db.relationship('ChatParticipant', backref='channel', lazy='dynamic', cascade="all, delete-orphan")
    messages = db.relationship('ChatMessage', backref='channel', lazy='dynamic', cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'fixture_id': self.fixture_id,
            'created_at': self.created_at.isoformat(),
            'last_message': self.get_last_message()
        }
        
    def get_last_message(self):
        last_msg = self.messages.order_by(ChatMessage.timestamp.desc()).first()
        if last_msg:
            return {
                'content': last_msg.content,
                'sender_name': last_msg.sender.name,
                'timestamp': last_msg.timestamp.isoformat()
            }
        return None

class ChatParticipant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('chat_channel.id', ondelete='CASCADE'), nullable=False)
    last_read_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('chat_participations', lazy='dynamic', cascade="all, delete-orphan", passive_deletes=True))

    __table_args__ = (db.UniqueConstraint('user_id', 'channel_id', name='unique_chat_participant'),)

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('chat_channel.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='SET NULL'), nullable=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    sender = db.relationship('User', backref=db.backref('messages_sent', lazy='dynamic', passive_deletes=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else '[Deleted User]',
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }


class FriendlyPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    captain_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    preferred_date = db.Column(db.Date, nullable=False)
    preferred_time = db.Column(db.String(20), nullable=False)
    venue_preference = db.Column(db.String(100))
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='open')  # open, matched, expired
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    team = db.relationship('Team', backref='friendly_posts')
    captain = db.relationship('User', backref='friendly_posts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'team_id': self.team_id,
            'team_name': self.team.name if self.team else None,
            'captain_name': self.captain.name if self.captain else None,
            'preferred_date': self.preferred_date.isoformat(),
            'preferred_time': self.preferred_time,
            'venue_preference': self.venue_preference,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }
