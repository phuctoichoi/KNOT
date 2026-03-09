from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.schemas.misc import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100),
    unread_only: bool = False,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    stmt = stmt.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
    return (await db.execute(stmt)).scalars().all()


@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification).where(Notification.id == notif_id, Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    return {"message": "Đã đánh dấu đã đọc"}


@router.patch("/read-all")
async def mark_all_read(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    return {"message": "Đã đánh dấu tất cả đã đọc"}


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    notif = await db.get(Notification, notif_id)
    if notif and notif.user_id == current_user.id:
        await db.delete(notif)
    return {"message": "Đã xóa thông báo"}
