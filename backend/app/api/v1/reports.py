import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from geoalchemy2.functions import ST_GeomFromText, ST_DWithin, ST_Y, ST_X
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user, require_roles
from app.core.audit import log_activity
from app.core.storage import upload_image
from app.core.email import send_email, report_submitted_email, report_status_changed_email
from app.models.report import Report, ReportImage, ReportStatus, DisasterType
from app.models.user import User
from app.schemas.report import ReportCreate, ReportStatusUpdate, ReportPublic, ReportListResponse
from app.websockets.manager import manager
import asyncio

router = APIRouter(prefix="/reports", tags=["reports"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


def _point_wkt(lat: float, lng: float) -> str:
    return f"POINT({lng} {lat})"


def _extract_coords(report: Report) -> tuple[float, float]:
    """Extract lat/lng from PostGIS geography."""
    # Use raw SQL result via ST_X/ST_Y in queries; fallback to 0
    return 0.0, 0.0


@router.post("", status_code=201)
async def submit_report(body: ReportCreate, request: Request, db: AsyncSession = Depends(get_db),
                        current_user=Depends(get_optional_user)):
    report = Report(
        report_type=body.report_type,
        disaster_type=body.disaster_type,
        severity=body.severity,
        title=body.title,
        description=body.description,
        location=ST_GeomFromText(_point_wkt(body.lat, body.lng), 4326),
        address_text=body.address_text,
        province=body.province,
        district=body.district,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
        submitted_by=current_user.id if current_user else None,
    )
    db.add(report)
    await db.flush()
    await log_activity("report_submit", user_id=current_user.id if current_user else None,
                       target_type="report", target_id=report.id,
                       ip_address=request.client.host if request.client else None)
    # Send email async
    asyncio.create_task(send_email(
        body.contact_email,
        "KNOT – Báo cáo đã được ghi nhận",
        report_submitted_email(report.id, body.disaster_type.value)
    ))
    # Notify via WebSocket
    asyncio.create_task(manager.broadcast_public({
        "type": "new_report",
        "report_id": report.id,
        "disaster_type": body.disaster_type.value,
        "lat": body.lat,
        "lng": body.lng,
        "severity": body.severity.value,
    }))
    return {"message": "Báo cáo đã được gửi thành công", "report_id": report.id}


@router.post("/{report_id}/images", status_code=201)
async def upload_report_images(report_id: str, files: List[UploadFile] = File(...),
                               db: AsyncSession = Depends(get_db)):
    import magic as _magic  # python-magic-bin (Windows) / python-magic (Linux)

    ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

    report = await db.get(Report, report_id)
    if not report or report.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    urls = []
    for f in files[:5]:  # max 5 images
        content = await f.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail=f"File {f.filename} quá lớn (tối đa 10MB)")
        # Server-side MIME validation — cannot be spoofed by renaming file extension
        detected_mime = _magic.from_buffer(content, mime=True)
        if detected_mime not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=415,
                detail=f"File {f.filename} không hợp lệ. Chỉ chấp nhận JPG, PNG, WebP, GIF. "
                       f"(Phát hiện: {detected_mime})"
            )
        url = await upload_image(content, detected_mime, f.filename)
        img = ReportImage(report_id=report_id, url=url, filename=f.filename, size_bytes=len(content))
        db.add(img)
        urls.append(url)
    return {"uploaded": urls}


@router.get("", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = None, status: Optional[str] = None,
    province: Optional[str] = None, district: Optional[str] = None,
    sort: str = "created_at:desc",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    stmt = select(Report).options(selectinload(Report.images)).where(Report.deleted_at.is_(None))
    if type:
        types = [t.strip() for t in type.split(",")]
        stmt = stmt.where(Report.disaster_type.in_(types))
    if status:
        statuses = [s.strip() for s in status.split(",")]
        stmt = stmt.where(Report.status.in_(statuses))
    if province:
        stmt = stmt.where(Report.province == province)
    if district:
        stmt = stmt.where(Report.district == district)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.order_by(Report.created_at.desc()).offset((page - 1) * limit).limit(limit)
    reports = (await db.execute(stmt)).scalars().all()
    items = []
    for r in reports:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        d["images"] = [{"id": i.id, "url": i.url, "filename": i.filename} for i in r.images]
        d.pop("contact_email", None)
        d.pop("contact_phone", None)
        d.pop("location", None)
        d["lat"] = None
        d["lng"] = None
        items.append(d)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/mine")
async def my_reports(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                     current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Report).options(selectinload(Report.images)).where(
        Report.submitted_by == current_user.id, Report.deleted_at.is_(None)
    ).order_by(Report.created_at.desc()).offset((page - 1) * limit).limit(limit)
    reports = (await db.execute(stmt)).scalars().all()
    return {"items": [r for r in reports], "page": page, "limit": limit}


@router.get("/{report_id}")
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Report).options(selectinload(Report.images)).where(Report.id == report_id, Report.deleted_at.is_(None))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    return report


@router.patch("/{report_id}/status")
async def update_report_status(
    report_id: str, body: ReportStatusUpdate, request: Request,
    current_user=Depends(require_roles("volunteer", "organization", "moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    report = await db.get(Report, report_id)
    if not report or report.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    old_status = report.status
    report.status = body.status
    if body.status == ReportStatus.verified:
        report.verified_by = current_user.id
        report.verified_at = datetime.now(timezone.utc)
    elif body.status == ReportStatus.resolved:
        report.resolved_by = current_user.id
        report.resolved_at = datetime.now(timezone.utc)

    action_map = {
        ReportStatus.verified: "report_verify",
        ReportStatus.rejected: "report_reject",
        ReportStatus.resolved: "report_resolve",
    }
    await log_activity(action_map.get(body.status, "admin_action"),
                       user_id=current_user.id, target_type="report", target_id=report_id,
                       description=body.reason, ip_address=request.client.host if request.client else None)
    # Notify submitter if known
    if report.submitted_by:
        asyncio.create_task(manager.send_to_user(report.submitted_by, {
            "type": "report_status_update", "report_id": report_id, "status": body.status.value
        }))
    if report.contact_email:
        asyncio.create_task(send_email(
            report.contact_email,
            "KNOT – Cập nhật báo cáo",
            report_status_changed_email(report_id, body.status.value)
        ))
    return {"message": f"Đã cập nhật trạng thái: {body.status.value}"}


@router.delete("/{report_id}")
async def delete_report(report_id: str, current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    report.deleted_at = datetime.now(timezone.utc)
    return {"message": "Đã xóa báo cáo"}
