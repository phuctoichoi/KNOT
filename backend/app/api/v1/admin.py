from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from app.core.database import get_db
from app.core.security import require_roles
from app.models.activity_log import ActivityLog

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/activity-logs")
async def activity_logs(
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
    action_type: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ActivityLog)
    if action_type:
        stmt = stmt.where(ActivityLog.action_type == action_type)
    if user_id:
        stmt = stmt.where(ActivityLog.user_id == user_id)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    logs = (await db.execute(stmt)).scalars().all()
    return {
        "items": [
            {"id": l.id, "user_id": l.user_id, "action_type": l.action_type.value,
             "target_type": l.target_type, "target_id": l.target_id,
             "description": l.description, "ip_address": l.ip_address, "created_at": str(l.created_at)}
            for l in logs
        ],
        "total": total, "page": page, "limit": limit
    }


@router.get("/system/stats")
async def system_stats(current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    result = (await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
            (SELECT COUNT(*) FROM users WHERE status='pending_approval' AND email_verified=true) AS pending_users,
            (SELECT COUNT(*) FROM reports WHERE deleted_at IS NULL) AS total_reports,
            (SELECT COUNT(*) FROM reports WHERE status='pending') AS pending_reports,
            (SELECT COUNT(*) FROM alerts WHERE is_active=true) AS active_alerts,
            (SELECT COUNT(*) FROM support_offers WHERE is_active=true) AS active_offers
    """))).fetchone()
    return dict(result._mapping)
