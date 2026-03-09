
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def check_user():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Total users in DB: {len(users)}")
        for u in users:
            print(f"---")
            print(f"ID: {u.id}")
            print(f"Name: {u.full_name}")
            print(f"Email: {u.email}")
            print(f"Role: {u.role}")
            print(f"Status: {u.status}")
            print(f"Email Verified: {u.email_verified}")
            print(f"Deleted At: {u.deleted_at}")

if __name__ == "__main__":
    asyncio.run(check_user())
