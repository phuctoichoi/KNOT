
import asyncio
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.activity_log import ActivityLog

async def check_user_activity():
    async with AsyncSessionLocal() as db:
        # Search by ID found earlier: 6076ec06-dc3e-4655-bc3f-1caf2870ede7
        result = await db.execute(select(User).where(User.id == '6076ec06-dc3e-4655-bc3f-1caf2870ede7'))
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
            print("User ID 6076ec06-dc3e-4655-bc3f-1caf2870ede7 not found")

if __name__ == "__main__":
    asyncio.run(check_user_activity())
