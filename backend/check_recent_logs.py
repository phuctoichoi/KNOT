
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.activity_log import ActivityLog

async def check_recent_logs():
    async with AsyncSessionLocal() as db:
        # Check logs from the last 30 minutes
        since = datetime.now(timezone.utc) - timedelta(minutes=30)
        result = await db.execute(select(ActivityLog).where(ActivityLog.created_at >= since).order_by(ActivityLog.created_at.desc()))
        logs = log_result = result.scalars().all()
        print(f"Total recent logs: {len(logs)}")
        for l in logs:
            print(f"[{l.created_at}] Action: {l.action_type.value} | User: {l.user_id} | Desc: {l.description}")

if __name__ == "__main__":
    asyncio.run(check_recent_logs())
