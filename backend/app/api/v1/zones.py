from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.functions import ST_GeomFromText
from app.core.database import get_db
from app.core.security import require_roles
from app.core.audit import log_activity
from app.models.zone import DisasterZone, ZoneType
from app.models.report import SeverityLevel
from app.schemas.misc import ZoneCreate, ZonePublic

router = APIRouter(prefix="/zones", tags=["zones"])


def _polygon_wkt(coords: List[List[float]]) -> str:
    """Convert [[lng, lat], ...] to WKT POLYGON string."""
    pts = ", ".join(f"{c[0]} {c[1]}" for c in coords)
    # Close the ring
    if coords[0] != coords[-1]:
        pts += f", {coords[0][0]} {coords[0][1]}"
    return f"POLYGON(({pts}))"


@router.post("", status_code=201)
async def create_zone(body: ZoneCreate, request: Request,
                      current_user=Depends(require_roles("moderator", "admin")),
                      db: AsyncSession = Depends(get_db)):
    wkt = _polygon_wkt(body.coordinates)
    zone = DisasterZone(
        name=body.name,
        zone_type=body.zone_type,
        severity=body.severity,
        description=body.description,
        polygon=ST_GeomFromText(wkt, 4326),
        is_danger=body.is_danger,
        is_spread=body.is_spread,
        start_time=body.start_time or datetime.now(timezone.utc),
        end_time=body.end_time,
        created_by=current_user.id,
    )
    db.add(zone)
    await db.flush()
    await log_activity("zone_create", user_id=current_user.id, target_type="zone", target_id=zone.id,
                       ip_address=request.client.host if request.client else None)
    return {"message": "Đã tạo vùng thiên tai", "zone_id": zone.id}


@router.get("", response_model=list[ZonePublic])
async def list_zones(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    stmt = select(DisasterZone).where((DisasterZone.end_time == None) | (DisasterZone.end_time > now))
    zones = (await db.execute(stmt)).scalars().all()
    return zones


@router.get("/{zone_id}", response_model=ZonePublic)
async def get_zone(zone_id: str, db: AsyncSession = Depends(get_db)):
    zone = await db.get(DisasterZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Không tìm thấy vùng")
    return zone


@router.patch("/{zone_id}")
async def update_zone(zone_id: str, name: Optional[str] = None, end_time: Optional[datetime] = None,
                      current_user=Depends(require_roles("moderator", "admin")),
                      db: AsyncSession = Depends(get_db)):
    zone = await db.get(DisasterZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Không tìm thấy vùng")
    if name:
        zone.name = name
    if end_time:
        zone.end_time = end_time
    await log_activity("zone_update", user_id=current_user.id, target_type="zone", target_id=zone_id)
    return {"message": "Đã cập nhật vùng"}


@router.delete("/{zone_id}")
async def delete_zone(zone_id: str, current_user=Depends(require_roles("admin")), db: AsyncSession = Depends(get_db)):
    zone = await db.get(DisasterZone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Không tìm thấy vùng")
    await db.delete(zone)
    return {"message": "Đã xóa vùng"}
