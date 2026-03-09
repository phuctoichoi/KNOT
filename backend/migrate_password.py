import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def run():
    async with AsyncSessionLocal() as db:
        await db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ"))
        await db.commit()
        print("✅ Added 'last_password_change' column to users table.")

if __name__ == "__main__":
    asyncio.run(run())
