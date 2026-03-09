from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.models.report import Report
from app.models.support import SupportOffer
from app.models.user import User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(..., min_length=2),
    type: Optional[str] = "reports,support",
    page: int = 1, limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    results = {}
    types = [t.strip() for t in type.split(",")]
    pattern = f"%{q}%"

    if "reports" in types:
        stmt = select(Report).where(
            Report.deleted_at.is_(None),
            or_(Report.title.ilike(pattern), Report.description.ilike(pattern), Report.address_text.ilike(pattern))
        ).limit(limit)
        reports = (await db.execute(stmt)).scalars().all()
        results["reports"] = [{"id": r.id, "title": r.title, "disaster_type": r.disaster_type.value,
                                "status": r.status.value, "province": r.province} for r in reports]

    if "support" in types:
        stmt = select(SupportOffer).where(
            SupportOffer.is_active == True,
            or_(SupportOffer.title.ilike(pattern), SupportOffer.description.ilike(pattern))
        ).limit(limit)
        offers = (await db.execute(stmt)).scalars().all()
        results["support"] = [{"id": o.id, "title": o.title, "support_type": o.support_type.value,
                                "province": o.province} for o in offers]

    if "organizations" in types:
        stmt = select(User).where(
            User.role == "organization", User.status == "approved", User.deleted_at.is_(None),
            or_(User.full_name.ilike(pattern), User.organization_name.ilike(pattern))
        ).limit(limit)
        orgs = (await db.execute(stmt)).scalars().all()
        results["organizations"] = [{"id": o.id, "name": o.organization_name or o.full_name,
                                     "province": o.province} for o in orgs]

    return {"query": q, "results": results}
