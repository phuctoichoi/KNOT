
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def audit_db():
    async with AsyncSessionLocal() as db:
        # Check Enums
        print("Checking account_status ENUM labels...")
        res = await db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'account_status'"))
        labels = [r[0] for r in res]
        print(f"ENUM labels: {labels}")

        # Check raw status values in users table
        print("\nChecking raw status values in users table...")
        res = await db.execute(text("SELECT DISTINCT status FROM users"))
        statuses = [str(r[0]) for r in res]
        print(f"Distinct statuses in DB: {statuses}")

        # Check default value for status column
        print("\nChecking default value for users.status column...")
        res = await db.execute(text("SELECT column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status'"))
        default = res.scalar()
        print(f"Default value: {default}")

if __name__ == "__main__":
    asyncio.run(audit_db())
