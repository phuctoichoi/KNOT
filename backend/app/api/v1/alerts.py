import asyncio
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import require_roles
from app.core.audit import log_activity
from app.models.alert import Alert, AlertSeverity
from app.schemas.misc import AlertCreate, AlertPublic
from app.websockets.manager import manager

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("", status_code=201)
async def create_alert(body: AlertCreate, request: Request,
                       current_user=Depends(require_roles("moderator", "admin")),
                       db: AsyncSession = Depends(get_db)):
    from geoalchemy2.functions import ST_GeomFromText
    loc = None
    if body.lat is not None and body.lng is not None:
        loc = ST_GeomFromText(f"POINT({body.lng} {body.lat})", 4326)

    alert = Alert(
        title=body.title, title_en=body.title_en,
        body=body.body, body_en=body.body_en,
        severity=body.severity,
        disaster_type=body.disaster_type,
        location=loc,
        province=body.province,
        expires_at=body.expires_at,
        created_by=current_user.id,
    )
    db.add(alert)
    await db.flush()
    await log_activity("alert_broadcast", user_id=current_user.id, target_type="alert", target_id=alert.id,
                       ip_address=request.client.host if request.client else None)
    asyncio.create_task(manager.broadcast_all({
        "type": "new_alert", "alert_id": alert.id,
        "title": alert.title, "severity": alert.severity.value,
        "province": alert.province,
    }))
    return {"message": "Cảnh báo đã được phát đi", "alert_id": alert.id}


@router.get("", response_model=list[AlertPublic])
async def list_alerts(province: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    stmt = select(Alert).where(Alert.is_active == True).where(
        (Alert.expires_at == None) | (Alert.expires_at > now)
    )
    if province:
        stmt = stmt.where((Alert.province == province) | (Alert.province == None))
    stmt = stmt.order_by(Alert.created_at.desc())
    alerts = (await db.execute(stmt)).scalars().all()
    return alerts


@router.get("/{alert_id}", response_model=AlertPublic)
async def get_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy cảnh báo")
    return alert


class AlertUpdate(BaseModel):
    is_active: Optional[bool] = None
    title: Optional[str] = None
    body: Optional[str] = None


@router.patch("/{alert_id}")
async def update_alert(alert_id: str, body: AlertUpdate,
                       current_user=Depends(require_roles("moderator", "admin")),
                       db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy cảnh báo")
    if body.is_active is not None:
        alert.is_active = body.is_active
    if body.title is not None:
        alert.title = body.title
    if body.body is not None:
        alert.body = body.body
    return {"message": "Đã cập nhật cảnh báo"}
