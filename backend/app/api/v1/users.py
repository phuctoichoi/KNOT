from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.audit import log_activity
from app.core.email import send_email, account_approved_email
from app.models.user import User, AccountStatus, UserRole


ROLE_HIERARCHY = {
    UserRole.admin: 100,
    UserRole.moderator: 80,
    UserRole.organization: 60,
    UserRole.volunteer: 40,
    UserRole.citizen: 20
}
from app.schemas.user import UserPublic, UserMe, UserUpdate, UserStatusUpdate, UserRoleUpdate, UserListResponse, UserPasswordChange
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
async def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMe)
async def update_me(body: UserUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, current_user.id)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(user, field, val)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/password")
async def change_password(body: UserPasswordChange, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, current_user.id)
    
    if not pwd_context.verify(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
        
    if user.last_password_change:
        days_since = (datetime.now(timezone.utc) - user.last_password_change).days
        if days_since < 7:
            raise HTTPException(status_code=400, detail=f"Bạn chỉ được đổi mật khẩu 7 ngày 1 lần. Vui lòng thử lại sau {7 - days_since} ngày.")
            
    if pwd_context.verify(body.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng với mật khẩu cũ")
        
    user.password_hash = pwd_context.hash(body.new_password)
    user.last_password_change = datetime.now(timezone.utc)
    
    await log_activity("user_password_change", user_id=user.id, target_type="user", target_id=user.id,
                       description="User changed their password via profile")
    
    await db.commit()
    return {"message": "Đổi mật khẩu thành công"}


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    search: Optional[str] = None,  # alias used by admin dashboard frontend
    current_user=Depends(require_roles("moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.deleted_at.is_(None))
    if role:
        stmt = stmt.where(User.role == role)
    if status:
        stmt = stmt.where(User.status == status)
    keyword = q or search
    if keyword:
        stmt = stmt.where(User.full_name.ilike(f"%{keyword}%") | User.email.ilike(f"%{keyword}%"))
    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar_one()
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    users = (await db.execute(stmt)).scalars().all()
    return {"items": users, "total": total, "page": page, "limit": limit}


@router.get("/pending", response_model=UserListResponse)
async def pending_users(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    current_user=Depends(require_roles("moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(
        User.status == AccountStatus.pending_approval,
        User.email_verified == True,
        User.deleted_at.is_(None)
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.order_by(User.created_at.asc()).offset((page - 1) * limit).limit(limit)
    users = (await db.execute(stmt)).scalars().all()
    return {"items": users, "total": total, "page": page, "limit": limit}


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: str, current_user=Depends(require_roles("moderator", "admin")), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


@router.patch("/{user_id}/status")
async def update_status(
    user_id: str, body: UserStatusUpdate,
    request: Request,
    current_user=Depends(require_roles("moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    old_status = user.status
    user.status = body.status
    action = "user_approve" if body.status == AccountStatus.active else \
             "user_reject" if body.status == AccountStatus.rejected else "user_disable"
    await log_activity(action, user_id=current_user.id, target_type="user", target_id=user_id,
                       description=body.reason, ip_address=request.client.host if request.client else None)
    await db.commit()
    if body.status == AccountStatus.active and old_status != AccountStatus.active:
        import asyncio
        asyncio.create_task(send_email(user.email, "KNOT – Tài khoản đã được phê duyệt", account_approved_email(user.full_name)))
    return {"message": f"Đã cập nhật trạng thái tài khoản: {body.status.value}"}


@router.patch("/{user_id}/role")
async def update_role(
    user_id: str, body: UserRoleUpdate,
    request: Request,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.role = body.role
    await log_activity("user_role_change", user_id=current_user.id, target_type="user", target_id=user_id,
                       description=f"Role changed to {body.role.value}", ip_address=request.client.host if request.client else None)
    await db.commit()
    return {"message": f"Đã cập nhật vai trò: {body.role.value}"}


class AdminUserUpdate(BaseModel):
    status: Optional[AccountStatus] = None
    role: Optional[UserRole] = None
    reason: Optional[str] = None


@router.patch("/{user_id}")
async def update_user_admin(
    user_id: str, body: AdminUserUpdate,
    request: Request,
    current_user=Depends(require_roles("moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    
    if body.role:
        if current_user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền đổi role")
        user.role = body.role
        await log_activity("user_role_change", user_id=current_user.id, target_type="user", target_id=user_id,
                           description=f"Role changed to {body.role.value}", ip_address=request.client.host if request.client else None)

    if body.status:
        old_status = user.status
        user.status = body.status
        action = "user_approve" if body.status == AccountStatus.active else \
                 "user_reject" if body.status == AccountStatus.rejected else "user_disable"
        await log_activity(action, user_id=current_user.id, target_type="user", target_id=user_id,
                           description=body.reason, ip_address=request.client.host if request.client else None)
        if body.status == AccountStatus.active and old_status != AccountStatus.active:
            import asyncio
            asyncio.create_task(send_email(user.email, "KNOT – Tài khoản đã được phê duyệt", account_approved_email(user.full_name)))

    await db.commit()
    return {"message": "Đã cập nhật tài khoản"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    current_user=Depends(require_roles("moderator", "admin")),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể tự xóa chính mình")

    # Check hierarchy: Admin can delete everyone except themselves. Moderator only strictly lower.
    can_delete = False
    if current_user.role == UserRole.admin:
        can_delete = True
    elif ROLE_HIERARCHY.get(current_user.role, 0) > ROLE_HIERARCHY.get(user.role, 0):
        can_delete = True

    if not can_delete:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa người dùng có cấp bậc tương đương hoặc cao hơn")

    await log_activity("admin_action", user_id=current_user.id, target_type="user", target_id=user_id,
                       description=f"Hard delete user: {user.email}", ip_address=request.client.host if request.client else None)
    await db.delete(user)
    await db.commit()
    return {"message": "Đã xóa vĩnh viễn người dùng"}
