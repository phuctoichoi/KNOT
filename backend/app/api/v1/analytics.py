from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.security import require_roles

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/reports/summary")
async def reports_summary(current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'verified') AS verified,
            COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
            COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
        FROM reports WHERE deleted_at IS NULL
    """))).fetchone()
    return dict(row._mapping)


@router.get("/reports/by-type")
async def reports_by_type(current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT disaster_type, COUNT(*) AS count FROM reports
        WHERE deleted_at IS NULL GROUP BY disaster_type ORDER BY count DESC
    """))).fetchall()
    return [{"type": r.disaster_type, "count": r.count} for r in rows]


@router.get("/reports/by-region")
async def reports_by_region(current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT province, COUNT(*) AS count FROM reports
        WHERE deleted_at IS NULL AND province IS NOT NULL
        GROUP BY province ORDER BY count DESC LIMIT 20
    """))).fetchall()
    return [{"province": r.province, "count": r.count} for r in rows]


@router.get("/reports/trend")
async def reports_trend(period: str = "daily", current_user=Depends(require_roles("admin")),
                        db: AsyncSession = Depends(get_db)):
    # Whitelist to prevent SQL injection via 'period' query param
    trunc = {"daily": "day", "weekly": "week", "monthly": "month"}.get(period, "day")
    rows = (await db.execute(text("""
        SELECT DATE_TRUNC(:trunc, created_at) AS period, COUNT(*) AS count
        FROM reports WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY period ORDER BY period
    """), {"trunc": trunc})).fetchall()
    return [{"period": str(r.period), "count": r.count} for r in rows]


@router.get("/volunteers/activity")
async def volunteer_activity(current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT u.id, u.full_name,
               COUNT(DISTINCT al.id) FILTER (WHERE al.action_type IN ('report_verify','report_resolve')) AS actions
        FROM users u
        LEFT JOIN activity_logs al ON al.user_id = u.id
        WHERE u.role IN ('volunteer','organization') AND u.deleted_at IS NULL
        GROUP BY u.id ORDER BY actions DESC LIMIT 20
    """))).fetchall()
    return [{"id": r.id, "full_name": r.full_name, "actions": r.actions} for r in rows]


@router.get("/resources/overview")
async def resources_overview(current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT resource_type, status, COUNT(*) AS count, SUM(quantity) AS total_qty
        FROM resources GROUP BY resource_type, status ORDER BY resource_type
    """))).fetchall()
    return [{"type": r.resource_type, "status": r.status, "count": r.count, "total_qty": r.total_qty} for r in rows]
