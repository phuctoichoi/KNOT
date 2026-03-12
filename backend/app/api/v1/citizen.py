"""
API endpoints for:
  1. Report Updates (Timeline/Comments) — POST/GET /reports/{id}/updates
  2. Safety Check-ins — POST /me/safety-checkin, GET /me/safety-checkins
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.storage import upload_image
from app.models.report import Report
import asyncio

router = APIRouter(tags=["citizen"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class SafeCheckinCreate(BaseModel):
    lat: float
    lng: float
    address_text: Optional[str] = None
    note: Optional[str] = None


# ─── Report Updates / Timeline ───────────────────────────────────────────────

@router.get("/reports/{report_id}/updates")
async def get_report_updates(
    report_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get timeline/updates for a specific report. Only the report owner or staff can view."""
    report = await db.get(Report, report_id)
    if not report or report.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")

    # Only the submitter or staff roles can see updates
    allowed_roles = {"volunteer", "organization", "moderator", "admin"}
    if report.submitted_by != current_user.id and current_user.role.value not in allowed_roles:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem cập nhật của báo cáo này")

    rows = (await db.execute(text("""
        SELECT ru.id, ru.content, ru.image_url, ru.created_at,
               u.id AS author_id, u.full_name AS author_name, u.role AS author_role
        FROM report_updates ru
        JOIN users u ON u.id = ru.user_id
        WHERE ru.report_id = :report_id
        ORDER BY ru.created_at ASC
    """), {"report_id": report_id})).fetchall()

    return [
        {
            "id": str(r.id),
            "content": r.content,
            "image_url": r.image_url,
            "created_at": r.created_at.isoformat(),
            "author": {
                "id": str(r.author_id),
                "full_name": r.author_name,
                "role": r.author_role,
            },
        }
        for r in rows
    ]


@router.post("/reports/{report_id}/updates", status_code=201)
async def add_report_update(
    report_id: str,
    content: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a text/image update to a report. Only the report owner or staff can add."""
    report = await db.get(Report, report_id)
    if not report or report.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")

    allowed_roles = {"volunteer", "organization", "moderator", "admin"}
    if report.submitted_by != current_user.id and current_user.role.value not in allowed_roles:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thêm cập nhật cho báo cáo này")

    image_url = None
    if image:
        ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        MAX_SIZE = 10 * 1024 * 1024
        content_bytes = await image.read()
        if len(content_bytes) > MAX_SIZE:
            raise HTTPException(status_code=413, detail="File ảnh quá lớn (tối đa 10MB)")
        import magic as _magic
        detected_mime = _magic.from_buffer(content_bytes, mime=True)
        if detected_mime not in ALLOWED_MIMES:
            raise HTTPException(status_code=415, detail="Chỉ chấp nhận JPG, PNG, WebP, GIF")
        image_url = await upload_image(content_bytes, detected_mime, image.filename)

    update_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO report_updates (id, report_id, user_id, content, image_url)
        VALUES (:id, :report_id, :user_id, :content, :image_url)
    """), {
        "id": update_id,
        "report_id": report_id,
        "user_id": current_user.id,
        "content": content,
        "image_url": image_url,
    })
    await db.commit()
    return {"id": update_id, "message": "Đã thêm cập nhật thành công"}


# ─── Safety Check-in ─────────────────────────────────────────────────────────

@router.post("/me/safety-checkin", status_code=201)
async def create_safety_checkin(
    body: SafeCheckinCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark yourself as safe at the given coordinates."""
    checkin_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO safety_checkins (id, user_id, lat, lng, address_text, note)
        VALUES (:id, :user_id, :lat, :lng, :address_text, :note)
    """), {
        "id": checkin_id,
        "user_id": current_user.id,
        "lat": body.lat,
        "lng": body.lng,
        "address_text": body.address_text,
        "note": body.note,
    })
    await db.commit()
    return {"id": checkin_id, "message": "Đã xác nhận an toàn tại vị trí của bạn!"}


@router.get("/me/safety-checkins")
async def get_my_safety_checkins(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's last 10 safety check-ins."""
    rows = (await db.execute(text("""
        SELECT id, lat, lng, address_text, note, created_at
        FROM safety_checkins
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT 10
    """), {"user_id": current_user.id})).fetchall()

    return [
        {
            "id": str(r.id),
            "lat": r.lat,
            "lng": r.lng,
            "address_text": r.address_text,
            "note": r.note,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


# ─── Public Safety Search ─────────────────────────────────────────────────────

@router.get("/safety-checkins/search")
async def search_safety_checkin(
    q: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: search for the latest safety check-in of a user by email or phone.
    Returns only name, approximate location (address_text), note, and timestamp.
    Exact coordinates are NEVER returned.
    """
    q = q.strip()
    if not q:
        raise HTTPException(status_code=422, detail="Vui lòng nhập email hoặc số điện thoại")

    row = (await db.execute(text("""
        SELECT
            u.full_name,
            sc.address_text,
            sc.note,
            sc.created_at
        FROM safety_checkins sc
        JOIN users u ON u.id = sc.user_id
        WHERE (
            u.email ILIKE :q
            OR u.phone ILIKE :q
        )
        AND sc.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY sc.created_at DESC
        LIMIT 1
    """), {"q": q})).fetchone()

    if not row:
        return {"found": False}

    return {
        "found": True,
        "full_name": row.full_name,
        "address_text": row.address_text,
        "note": row.note,
        "checked_in_at": row.created_at.isoformat(),
    }

