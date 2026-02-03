from app import create_app, db
from app.models import ChatChannel, ChatParticipant, ChatMessage

app = create_app()
with app.app_context():
    db.create_all()
    print("Chat tables created successfully.")
