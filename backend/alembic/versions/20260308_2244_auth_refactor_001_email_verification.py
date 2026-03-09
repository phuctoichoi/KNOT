"""auth_refactor_email_verification

Revision ID: auth_refactor_001
Revises: 254439bbd623
Create Date: 2026-03-08 22:44:00.000000

Migrates AccountStatus enum from (pending, approved, rejected, disabled)
to (pending_verification, pending_approval, active, rejected, suspended).
Adds email_verified boolean column.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'auth_refactor_001'
down_revision: Union[str, None] = '254439bbd623'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_ENUM_VALUES = ('pending', 'approved', 'rejected', 'disabled')
NEW_ENUM_VALUES = ('pending_verification', 'pending_approval', 'active', 'rejected', 'suspended')


def upgrade() -> None:
    # 1. Add email_verified column with default False
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))

    # 2. Rename enum type in Postgres (must drop & recreate since pg doesn't support rename-in-place easily)
    # First rename old type to a temp name
    op.execute("ALTER TYPE account_status RENAME TO account_status_old")

    # Create the new enum with new values
    op.execute("""
        CREATE TYPE account_status AS ENUM (
            'pending_verification',
            'pending_approval',
            'active',
            'rejected',
            'suspended'
        )
    """)

    # 3. Change the column to use the new type, mapping old → new values
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN status DROP DEFAULT
    """)
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN status TYPE account_status USING (
            CASE status::text
                WHEN 'pending'  THEN 'pending_verification'::account_status
                WHEN 'approved' THEN 'active'::account_status
                WHEN 'rejected' THEN 'rejected'::account_status
                WHEN 'disabled' THEN 'suspended'::account_status
                ELSE 'pending_verification'::account_status
            END
        )
    """)
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN status SET DEFAULT 'pending_verification'::account_status
    """)

    # 4. Drop the old enum type
    op.execute("DROP TYPE account_status_old")


def downgrade() -> None:
    # Reverse: rename new back to temp, create old enum, map values back
    op.execute("ALTER TYPE account_status RENAME TO account_status_new")

    op.execute("""
        CREATE TYPE account_status AS ENUM (
            'pending', 'approved', 'rejected', 'disabled'
        )
    """)

    op.execute("""
        ALTER TABLE users
        ALTER COLUMN status DROP DEFAULT
    """)
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN status TYPE account_status USING (
            CASE status::text
                WHEN 'pending_verification' THEN 'pending'::account_status
                WHEN 'pending_approval'     THEN 'pending'::account_status
                WHEN 'active'               THEN 'approved'::account_status
                WHEN 'rejected'             THEN 'rejected'::account_status
                WHEN 'suspended'            THEN 'disabled'::account_status
                ELSE 'pending'::account_status
            END
        )
    """)
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN status SET DEFAULT 'pending'::account_status
    """)
    op.execute("DROP TYPE account_status_new")

    # Remove email_verified column
    op.drop_column('users', 'email_verified')
