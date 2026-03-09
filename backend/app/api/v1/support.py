from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.functions import ST_GeomFromText
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.audit import log_activity
from app.models.support import SupportOffer, Resource, ResourceStatus
from app.schemas.misc import SupportOfferCreate, SupportOfferPublic, ResourceCreate, ResourcePublic

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/offers", status_code=201)
async def create_offer(body: SupportOfferCreate,
                       current_user=Depends(require_roles("organization", "moderator", "admin")),
                       db: AsyncSession = Depends(get_db)):
    loc = None
    if body.lat is not None and body.lng is not None:
        loc = ST_GeomFromText(f"POINT({body.lng} {body.lat})", 4326)
    offer = SupportOffer(
        org_id=current_user.id,
        support_type=body.support_type,
        title=body.title,
        description=body.description,
        location=loc,
        address_text=body.address_text,
        province=body.province,
        capacity=body.capacity,
        expires_at=body.expires_at,
    )
    db.add(offer)
    await db.flush()
    await log_activity("support_offer_create", user_id=current_user.id, target_type="support_offer", target_id=offer.id)
    return {"message": "Đã đăng tải hỗ trợ", "offer_id": offer.id}


@router.get("/offers", response_model=list[SupportOfferPublic])
async def list_offers(province: Optional[str] = None, support_type: Optional[str] = None,
                      page: int = 1, limit: int = 20, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    stmt = select(SupportOffer).where(
        SupportOffer.is_active == True,
        (SupportOffer.expires_at == None) | (SupportOffer.expires_at > now)
    )
    if province:
        stmt = stmt.where(SupportOffer.province == province)
    if support_type:
        stmt = stmt.where(SupportOffer.support_type == support_type)
    stmt = stmt.order_by(SupportOffer.created_at.desc()).offset((page - 1) * limit).limit(limit)
    return (await db.execute(stmt)).scalars().all()


@router.get("/offers/{offer_id}", response_model=SupportOfferPublic)
async def get_offer(offer_id: str, db: AsyncSession = Depends(get_db)):
    offer = await db.get(SupportOffer, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Không tìm thấy điểm hỗ trợ")
    return offer


@router.patch("/offers/{offer_id}")
async def update_offer(offer_id: str, is_active: Optional[bool] = None,
                       current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    offer = await db.get(SupportOffer, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Không tìm thấy điểm hỗ trợ")
    if offer.org_id != current_user.id and current_user.role.value not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Không có quyền")
    if is_active is not None:
        offer.is_active = is_active
    return {"message": "Đã cập nhật"}


@router.get("/resources", response_model=list[ResourcePublic])
async def list_resources(current_user=Depends(require_roles("organization", "moderator", "admin")),
                         db: AsyncSession = Depends(get_db)):
    org_id = current_user.id if current_user.role.value == "organization" else None
    stmt = select(Resource)
    if org_id:
        stmt = stmt.where(Resource.org_id == org_id)
    return (await db.execute(stmt)).scalars().all()


@router.post("/resources", status_code=201)
async def add_resource(body: ResourceCreate,
                       current_user=Depends(require_roles("organization", "admin")),
                       db: AsyncSession = Depends(get_db)):
    resource = Resource(
        org_id=current_user.id,
        resource_type=body.resource_type,
        name=body.name,
        quantity=body.quantity,
        unit=body.unit,
        notes=body.notes,
    )
    db.add(resource)
    await db.flush()
    return {"message": "Đã thêm nguồn lực", "resource_id": resource.id}


@router.patch("/resources/{resource_id}")
async def update_resource(resource_id: str, quantity: Optional[int] = None,
                          status: Optional[str] = None,
                          current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Không tìm thấy nguồn lực")
    if resource.org_id != current_user.id and current_user.role.value not in ("admin",):
        raise HTTPException(status_code=403, detail="Không có quyền")
    if quantity is not None:
        resource.quantity = quantity
    if status:
        resource.status = status
        if status == ResourceStatus.deployed.value:
            resource.deployed_at = datetime.now(timezone.utc)
    await log_activity("resource_update", user_id=current_user.id, target_type="resource", target_id=resource_id)
    return {"message": "Đã cập nhật nguồn lực"}


# ──────────────────────────────────────────────────────────────────────────────
# Relief Posts (Thông báo cứu trợ)
# ──────────────────────────────────────────────────────────────────────────────

from app.models.support import ReliefPost
from app.schemas.misc import ReliefPostCreate, ReliefPostPublic
from app.models.user import User


@router.post("/relief", status_code=201)
async def create_relief_post(
    body: ReliefPostCreate,
    current_user=Depends(require_roles("organization")),
    db: AsyncSession = Depends(get_db),
):
    post = ReliefPost(
        org_id=current_user.id,
        title=body.title,
        content=body.content,
        route=body.route,
        province=body.province,
        district=body.district,
        contact_phone=body.contact_phone,
        contact_email=body.contact_email,
        starts_at=body.starts_at,
        expires_at=body.expires_at,
    )
    db.add(post)
    await db.flush()
    await db.commit()
    await log_activity("support_offer_create", user_id=current_user.id, target_type="relief_post", target_id=post.id,
                       description=f"New relief post: {body.title}")
    return {"message": "Đã đăng bài thông báo cứu trợ", "post_id": post.id}


@router.get("/relief")
async def list_relief_posts(
    province: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stmt = select(ReliefPost, User.full_name.label("org_name")).join(
        User, ReliefPost.org_id == User.id
    ).where(
        ReliefPost.is_active == True,
        (ReliefPost.expires_at == None) | (ReliefPost.expires_at > now),
    )
    if province:
        stmt = stmt.where(ReliefPost.province == province)
    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar_one()
    stmt = stmt.order_by(ReliefPost.created_at.desc()).offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(stmt)).all()
    items = []
    for post, org_name in rows:
        d = {c.name: getattr(post, c.name) for c in post.__table__.columns}
        d["org_name"] = org_name
        items.append(d)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/relief/{post_id}")
async def get_relief_post(post_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReliefPost, User.full_name.label("org_name"))
        .join(User, ReliefPost.org_id == User.id)
        .where(ReliefPost.id == post_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo cứu trợ")
    post, org_name = row
    d = {c.name: getattr(post, c.name) for c in post.__table__.columns}
    d["org_name"] = org_name
    return d


@router.delete("/relief/{post_id}")
async def delete_relief_post(
    post_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(ReliefPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo cứu trợ")
    is_owner = post.org_id == current_user.id
    is_mod_admin = current_user.role.value in ("moderator", "admin")
    if not is_owner and not is_mod_admin:
        raise HTTPException(status_code=403, detail="Không có quyền xóa bài này")
    await db.delete(post)
    await db.commit()
    await log_activity("admin_action", user_id=current_user.id, target_type="relief_post", target_id=post_id,
                       description=f"Deleted relief post: {post.title}")
    return {"message": "Đã xóa bài thông báo cứu trợ"}

