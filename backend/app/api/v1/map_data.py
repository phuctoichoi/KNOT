from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core.database import get_db
from app.models.report import Report, DisasterType, ReportStatus
from app.models.support import SupportOffer
from app.models.zone import DisasterZone

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/reports")
async def map_reports(
    types: Optional[str] = None,
    statuses: Optional[str] = None,
    province: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return GeoJSON FeatureCollection of all report markers."""
    type_filter = [t.strip() for t in types.split(",")] if types else None
    status_filter = [s.strip() for s in statuses.split(",")] if statuses else \
        [ReportStatus.pending.value, ReportStatus.verified.value, ReportStatus.in_progress.value]

    # Build query dynamically to avoid asyncpg null type inference errors
    query = """
        SELECT id, report_type, disaster_type, severity, status, title,
               ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng,
               address_text, province, created_at
        FROM reports
        WHERE deleted_at IS NULL
          AND status = ANY(:statuses)
    """
    params = {"statuses": status_filter}

    if type_filter:
        query += " AND disaster_type = ANY(:types)"
        params["types"] = type_filter

    if province:
        query += " AND province = :province"
        params["province"] = province

    query += " ORDER BY created_at DESC LIMIT 2000"

    rows = await db.execute(text(query), params)
    features = []
    for row in rows:
        if row.lat is None or row.lng is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [row.lng, row.lat]},
            "properties": {
                "id": row.id,
                "report_type": row.report_type,
                "disaster_type": row.disaster_type,
                "severity": row.severity,
                "status": row.status,
                "title": row.title,
                "address_text": row.address_text,
                "province": row.province,
                "created_at": str(row.created_at),
            }
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/support-locations")
async def map_support(province: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(SupportOffer).where(SupportOffer.is_active == True, SupportOffer.location.isnot(None))
    if province:
        stmt = stmt.where(SupportOffer.province == province)
    offers = (await db.execute(stmt)).scalars().all()
    query = """
        SELECT id, support_type, title, address_text, province,
               ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng
        FROM support_offers
        WHERE is_active = true AND location IS NOT NULL
    """
    params = {}
    if province:
        query += " AND province = :province"
        params["province"] = province

    rows = await db.execute(text(query), params)
    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [row.lng, row.lat]},
            "properties": {"id": row.id, "support_type": row.support_type, "title": row.title,
                           "address_text": row.address_text, "province": row.province}
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/heatmap")
async def map_heatmap(db: AsyncSession = Depends(get_db)):
    """Return lightweight lat/lng/weight array for heatmap layer."""
    rows = await db.execute(
        text("""
            SELECT ST_Y(location::geometry) AS lat,
                   ST_X(location::geometry) AS lng,
                   CASE severity
                       WHEN 'low' THEN 0.25 WHEN 'medium' THEN 0.5
                       WHEN 'high' THEN 0.75 WHEN 'critical' THEN 1.0
                       ELSE 0.5 END AS weight
            FROM reports
            WHERE deleted_at IS NULL AND status != 'rejected'
        """)
    )
    return [[r.lat, r.lng, r.weight] for r in rows if r.lat and r.lng]


@router.get("/zones")
async def map_zones(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        text("""
            SELECT id, name, zone_type, severity, description, is_danger, is_spread,
                   ST_AsGeoJSON(polygon::geometry)::json AS geojson
            FROM disaster_zones
            WHERE (end_time IS NULL OR end_time > NOW())
        """)
    )
    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": row.geojson,
            "properties": {
                "id": row.id, "name": row.name, "zone_type": row.zone_type,
                "severity": row.severity, "description": row.description,
                "is_danger": row.is_danger, "is_spread": row.is_spread,
            }
        })
    return {"type": "FeatureCollection", "features": features}
