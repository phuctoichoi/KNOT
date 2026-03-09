
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.activity_log import ActivityLog

async def check_user_activity():
    async with AsyncSessionLocal() as db:
        # Check user status
        result = await db.execute(select(User).where(User.full_name == 'Nguyen Van A'))
        user = result.scalar_one_or_none()
        if user:
            print(f"User: {user.full_name} ({user.email})")
            print(f"Status: {user.status}")
            print(f"Verified: {user.email_verified}")
            print(f"Last Login: {user.last_login_at}")
            
            # Check logs
            log_result = await db.execute(select(ActivityLog).where(ActivityLog.user_id == user.id))
            logs = log_result.scalars().all()
            print(f"Total Logs: {len(logs)}")
            for l in logs:
                print(f" - {l.created_at}: {l.action_type.value} | {l.description}")
        else:
            print("User 'Nguyen Van A' not found")

if __name__ == "__main__":
    asyncio.run(check_user_activity())
