
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def check_user():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == 'admin2@knot.vn'))
        user = result.scalar_one_or_none()
        if user:
            print(f"ID: {user.id}")
            print(f"Name: {user.full_name}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role}")
            print(f"Status: {user.status}")
            print(f"Email Verified: {user.email_verified}")
        else:
            print("User not found")

if __name__ == "__main__":
    asyncio.run(check_user())
