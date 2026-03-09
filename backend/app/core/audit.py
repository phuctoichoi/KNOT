from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def log_activity(
    action_type: str,
    user_id: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Write an audit log entry. Fire-and-forget; never raises."""
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    INSERT INTO activity_logs
                        (user_id, action_type, target_type, target_id, description, ip_address, user_agent)
                    VALUES
                        (:user_id, :action_type, :target_type, :target_id, :description, CAST(:ip_address AS inet), :user_agent)
                """),
                {
                    "user_id": user_id,
                    "action_type": action_type,
                    "target_type": target_type,
                    "target_id": target_id,
                    "description": description,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                },
            )
            await db.commit()
    except Exception:
        import logging
        logging.getLogger("knot.audit").exception("Failed to write audit log")
