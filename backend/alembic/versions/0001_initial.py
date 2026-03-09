"""Initial migration — full KNOT schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-03-08

This migration creates the complete database schema from scratch.
It is equivalent to running database/db.sql manually but managed by Alembic.

If you already ran db.sql on your database, stamp this migration as done
WITHOUT running it:
    alembic stamp 0001_initial

If you are starting fresh (empty database), run normally:
    alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ─── Extensions ───────────────────────────────────────────────────────────
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    # ─── Enum types ────────────────────────────────────────────────────────────
    op.execute("CREATE TYPE user_role AS ENUM ('citizen','volunteer','organization','moderator','admin')")
    op.execute("CREATE TYPE account_status AS ENUM ('pending','approved','rejected','disabled')")
    op.execute("CREATE TYPE disaster_type AS ENUM ('flood','landslide','storm','fire','earthquake','infrastructure','other')")
    op.execute("CREATE TYPE report_type AS ENUM ('emergency','damage')")
    op.execute("CREATE TYPE severity_level AS ENUM ('low','medium','high','critical')")
    op.execute("CREATE TYPE report_status AS ENUM ('pending','verified','in_progress','resolved','rejected')")
    op.execute("CREATE TYPE alert_severity AS ENUM ('info','warning','danger','critical')")
    op.execute("CREATE TYPE zone_type AS ENUM ('flood','landslide','wildfire','storm','earthquake','other')")
    op.execute("CREATE TYPE support_type AS ENUM ('food','water','medical','volunteers','equipment','other')")
    op.execute("CREATE TYPE resource_status AS ENUM ('available','deployed','exhausted')")
    op.execute("""
        CREATE TYPE notification_type AS ENUM (
            'report_submitted','report_verified','report_in_progress','report_resolved',
            'report_rejected','alert','nearby_emergency','account_approved','account_rejected',
            'volunteer_response','system'
        )
    """)
    op.execute("""
        CREATE TYPE action_type AS ENUM (
            'user_register','user_approve','user_reject','user_disable','user_role_change',
            'report_submit','report_verify','report_reject','report_resolve',
            'alert_broadcast','zone_create','zone_update','support_offer_create',
            'resource_update','admin_action','login','logout'
        )
    """)

    # ─── Auto-update trigger ───────────────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql
    """)

    # ─── users ────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('full_name', sa.String(200), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('phone', sa.String(20)),
        sa.Column('password_hash', sa.Text, nullable=False),
        sa.Column('role', sa.Text, nullable=False, server_default='citizen'),
        sa.Column('status', sa.Text, nullable=False, server_default='pending'),
        sa.Column('avatar_url', sa.Text),
        sa.Column('organization_name', sa.String(300)),
        sa.Column('province', sa.String(100)),
        sa.Column('district', sa.String(100)),
        sa.Column('last_login_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_status', 'users', ['status'])
    op.execute("CREATE INDEX idx_users_name_trgm ON users USING GIN (full_name gin_trgm_ops)")
    op.execute("CREATE TRIGGER trg_users_upd BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at()")

    # ─── reports ──────────────────────────────────────────────────────────────
    op.create_table(
        'reports',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('report_type', sa.Text, nullable=False),
        sa.Column('disaster_type', sa.Text, nullable=False),
        sa.Column('severity', sa.Text, nullable=False, server_default='medium'),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('status', sa.Text, nullable=False, server_default='pending'),
        sa.Column('location', sa.Text, nullable=False),   # handled as Geography by PostGIS
        sa.Column('address_text', sa.String(500)),
        sa.Column('province', sa.String(100)),
        sa.Column('district', sa.String(100)),
        sa.Column('contact_email', sa.String(255), nullable=False),
        sa.Column('contact_phone', sa.String(20)),
        sa.Column('submitted_by', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('verified_by', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('verified_at', sa.DateTime(timezone=True)),
        sa.Column('resolved_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )
    # Geography location column — must use raw SQL (Alembic doesn't know Geography type natively)
    op.execute("ALTER TABLE reports ALTER COLUMN location TYPE GEOGRAPHY(POINT,4326) USING ST_GeomFromText('POINT(0 0)',4326)")
    op.execute("CREATE INDEX idx_reports_location ON reports USING GIST(location)")
    op.create_index('idx_reports_status', 'reports', ['status'])
    op.create_index('idx_reports_dtype', 'reports', ['disaster_type'])
    op.create_index('idx_reports_province', 'reports', ['province'])
    op.create_index('idx_reports_submitted_by', 'reports', ['submitted_by'])
    op.execute("CREATE INDEX idx_reports_created_at ON reports(created_at DESC)")
    op.execute("CREATE INDEX idx_reports_title_trgm ON reports USING GIN (title gin_trgm_ops)")
    op.execute("CREATE TRIGGER trg_reports_upd BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at()")

    # ─── report_images ─────────────────────────────────────────────────────────
    op.create_table(
        'report_images',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('report_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('reports.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.Text, nullable=False),
        sa.Column('filename', sa.String(255)),
        sa.Column('size_bytes', sa.Integer),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_report_images_report', 'report_images', ['report_id'])

    # ─── alerts ────────────────────────────────────────────────────────────────
    op.create_table(
        'alerts',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('title_en', sa.String(500)),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('body_en', sa.Text),
        sa.Column('severity', sa.Text, nullable=False, server_default='warning'),
        sa.Column('disaster_type', sa.Text),
        sa.Column('location', sa.Text),
        sa.Column('province', sa.String(100)),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_by', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("ALTER TABLE alerts ALTER COLUMN location TYPE GEOGRAPHY(POINT,4326) USING NULL")
    op.create_index('idx_alerts_active', 'alerts', ['is_active', 'expires_at'])
    op.create_index('idx_alerts_province', 'alerts', ['province'])
    op.execute("CREATE TRIGGER trg_alerts_upd BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at()")

    # ─── disaster_zones ────────────────────────────────────────────────────────
    op.create_table(
        'disaster_zones',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('name', sa.String(300), nullable=False),
        sa.Column('zone_type', sa.Text, nullable=False),
        sa.Column('severity', sa.Text, nullable=False, server_default='medium'),
        sa.Column('description', sa.Text),
        sa.Column('polygon', sa.Text, nullable=False),
        sa.Column('is_danger', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_spread', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('start_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True)),
        sa.Column('created_by', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("ALTER TABLE disaster_zones ALTER COLUMN polygon TYPE GEOGRAPHY(POLYGON,4326) USING ST_GeomFromText('POLYGON((0 0,1 0,1 1,0 1,0 0))',4326)")
    op.execute("CREATE INDEX idx_zones_polygon ON disaster_zones USING GIST(polygon)")
    op.create_index('idx_zones_type', 'disaster_zones', ['zone_type'])
    op.execute("CREATE TRIGGER trg_zones_upd BEFORE UPDATE ON disaster_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at()")

    # ─── support_offers ────────────────────────────────────────────────────────
    op.create_table(
        'support_offers',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('support_type', sa.Text, nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('location', sa.Text),
        sa.Column('address_text', sa.String(500)),
        sa.Column('province', sa.String(100)),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('capacity', sa.Integer),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("ALTER TABLE support_offers ALTER COLUMN location TYPE GEOGRAPHY(POINT,4326) USING NULL")
    op.execute("CREATE INDEX idx_support_location ON support_offers USING GIST(location)")
    op.create_index('idx_support_org', 'support_offers', ['org_id'])
    op.create_index('idx_support_active', 'support_offers', ['is_active'])
    op.execute("CREATE TRIGGER trg_support_upd BEFORE UPDATE ON support_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at()")

    # ─── resources ─────────────────────────────────────────────────────────────
    op.create_table(
        'resources',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('org_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_type', sa.Text, nullable=False),
        sa.Column('name', sa.String(300), nullable=False),
        sa.Column('quantity', sa.Integer, nullable=False, server_default='0'),
        sa.Column('unit', sa.String(50)),
        sa.Column('status', sa.Text, nullable=False, server_default='available'),
        sa.Column('deployed_at', sa.DateTime(timezone=True)),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_resources_org', 'resources', ['org_id'])
    op.create_index('idx_resources_status', 'resources', ['status'])
    op.execute("CREATE TRIGGER trg_resources_upd BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at()")

    # ─── notifications ─────────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.Text, nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('body', sa.Text),
        sa.Column('link', sa.Text),
        sa.Column('is_read', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('related_report_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('reports.id', ondelete='SET NULL')),
        sa.Column('related_alert_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('alerts.id', ondelete='SET NULL')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_notif_user', 'notifications', ['user_id', 'is_read'])
    op.execute("CREATE INDEX idx_notif_created ON notifications(created_at DESC)")

    # ─── activity_logs ─────────────────────────────────────────────────────────
    op.create_table(
        'activity_logs',
        sa.Column('id', postgresql.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('action_type', sa.Text, nullable=False),
        sa.Column('target_type', sa.String(100)),
        sa.Column('target_id', postgresql.UUID(as_uuid=False)),
        sa.Column('description', sa.Text),
        sa.Column('ip_address', sa.String(50)),
        sa.Column('user_agent', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_logs_user', 'activity_logs', ['user_id'])
    op.create_index('idx_logs_action', 'activity_logs', ['action_type'])
    op.execute("CREATE INDEX idx_logs_created ON activity_logs(created_at DESC)")
    op.create_index('idx_logs_target', 'activity_logs', ['target_type', 'target_id'])


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_table('activity_logs')
    op.drop_table('notifications')
    op.drop_table('resources')
    op.drop_table('support_offers')
    op.drop_table('disaster_zones')
    op.drop_table('report_images')
    op.drop_table('alerts')
    op.drop_table('reports')
    op.drop_table('users')

    # Drop enum types
    for t in ['action_type', 'notification_type', 'resource_status', 'support_type',
              'zone_type', 'alert_severity', 'report_status', 'severity_level',
              'report_type', 'disaster_type', 'account_status', 'user_role']:
        op.execute(f'DROP TYPE IF EXISTS {t}')

    # Drop trigger function
    op.execute('DROP FUNCTION IF EXISTS update_updated_at()')
