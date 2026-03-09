
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS relief_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        route VARCHAR(500),
        province VARCHAR(100),
        district VARCHAR(100),
        contact_phone VARCHAR(20),
        contact_email VARCHAR(255),
        starts_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_relief_province ON relief_posts(province)",
    "CREATE INDEX IF NOT EXISTS idx_relief_org ON relief_posts(org_id)",
    "CREATE INDEX IF NOT EXISTS idx_relief_active ON relief_posts(is_active, expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_relief_created ON relief_posts(created_at DESC)",
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_relief_upd'
        ) THEN
            CREATE TRIGGER trg_relief_upd
            BEFORE UPDATE ON relief_posts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        END IF;
    END
    $$
    """,
]

async def run():
    async with AsyncSessionLocal() as db:
        for stmt in STATEMENTS:
            await db.execute(text(stmt))
        await db.commit()
        print("✅ Table 'relief_posts' and indexes created successfully.")

if __name__ == "__main__":
    asyncio.run(run())
