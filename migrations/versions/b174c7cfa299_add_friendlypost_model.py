"""Add FriendlyPost model

Revision ID: b174c7cfa299
Revises: 4b5a0c9185e5
Create Date: 2026-03-04 21:07:40.235362

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b174c7cfa299'
down_revision = '4b5a0c9185e5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('friendly_post',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), sa.ForeignKey('team.id'), nullable=False),
        sa.Column('captain_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('preferred_date', sa.Date(), nullable=False),
        sa.Column('preferred_time', sa.String(length=20), nullable=False),
        sa.Column('venue_preference', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='open', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('friendly_post')
