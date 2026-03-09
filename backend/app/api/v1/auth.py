import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user
)
from app.core.redis import get_redis
from app.core.audit import log_activity
from app.core.email import (
    send_email, verification_email, reset_password_email,
    account_approved_email, org_pending_approval_email
)
from app.models.user import User, AccountStatus, UserRole
from app.schemas.user import UserRegister, UserLogin, TokenResponse
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

VERIFY_PREFIX = "email_verify:"
RESET_PREFIX  = "reset_pwd:"
RESEND_COOLDOWN_PREFIX = "resend_cooldown:"

_ROLES_BLOCKED_FROM_REGISTER = {UserRole.moderator, UserRole.admin}
_ROLES_AUTO_ACTIVATE = {UserRole.citizen, UserRole.volunteer}


def _gen_token() -> str:
    return secrets.token_urlsafe(32)


async def _store_token(redis, prefix: str, token: str, user_id: str, expire_minutes: int):
    await redis.setex(f"{prefix}{token}", expire_minutes * 60, user_id)


async def _pop_token(redis, prefix: str, token: str) -> str | None:
    """Get and delete a token (single-use)."""
    key = f"{prefix}{token}"
    user_id = await redis.get(key)
    if user_id:
        await redis.delete(key)
    return user_id if isinstance(user_id, str) else (user_id.decode() if user_id else None)


# ──────────────────────────────────────────────────────────────────────────────
# Register
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: UserRegister, request: Request, db: AsyncSession = Depends(get_db)):
    # Block moderator/admin self-registration
    if body.role in _ROLES_BLOCKED_FROM_REGISTER:
        raise HTTPException(status_code=403, detail="Vai trò này không thể tự đăng ký")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email đã được sử dụng")

    user = User(
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=body.role,
        status=AccountStatus.pending_verification,
        email_verified=False,
        organization_name=body.organization_name,
        province=body.province,
        district=body.district,
    )
    db.add(user)
    await db.flush()
    await db.commit()
    await db.refresh(user)

    # Generate and store verification token
    token = _gen_token()
    redis = await get_redis()
    await _store_token(redis, VERIFY_PREFIX, token, user.id, settings.EMAIL_VERIFICATION_EXPIRE_MINUTES)

    # Send verification email
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    await send_email(
        body.email,
        "Xác thực tài khoản KNOT",
        verification_email(body.full_name, verify_url)
    )

    await log_activity(
        "user_register", user_id=user.id,
        target_type="user", target_id=user.id,
        description=f"New {user.role.value} registration: {user.email}",
        ip_address=request.client.host if request.client else None,
    )
    return {"message": "Kiểm tra email để xác thực tài khoản.", "user_id": user.id}


# ──────────────────────────────────────────────────────────────────────────────
# Email Verification
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/verify-email")
async def verify_email(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    redis = await get_redis()
    user_id = await _pop_token(redis, VERIFY_PREFIX, token)
    if not user_id:
        import logging
        logging.getLogger("knot.auth").warning(f"Email verification failed: token not found or expired. Token starts with: {token[:8]}...")
        raise HTTPException(status_code=400, detail="Liên kết xác thực đã hết hạn hoặc không hợp lệ")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    user.email_verified = True

    if user.role in _ROLES_AUTO_ACTIVATE:
        user.status = AccountStatus.active
    else:
        # organization → pending_approval
        user.status = AccountStatus.pending_approval
        # Notify user that they're now pending admin approval
        await send_email(
            user.email,
            "Email xác thực thành công – chờ phê duyệt",
            org_pending_approval_email(user.full_name)
        )
    await log_activity(
        "email_verify_success", user_id=user.id,
        target_type="user", target_id=user.id,
        description=f"Email verified successfully. New status: {user.status.value}",
        ip_address=None # No request context here easily or just pass None
    )
    await db.commit()
    return {"message": "Xác thực email thành công", "role": user.role.value, "status": user.status.value}


# ──────────────────────────────────────────────────────────────────────────────
# Resend Verification
# ──────────────────────────────────────────────────────────────────────────────

class ResendRequest(BaseModel):
    email: EmailStr

@router.post("/resend-verification")
async def resend_verification(body: ResendRequest, db: AsyncSession = Depends(get_db)):
    redis = await get_redis()
    # Rate limit: 1 resend per 3 minutes per email
    cooldown_key = f"{RESEND_COOLDOWN_PREFIX}{body.email}"
    if await redis.exists(cooldown_key):
        raise HTTPException(status_code=429, detail="Vui lòng đợi 3 phút trước khi gửi lại")

    result = await db.execute(select(User).where(User.email == body.email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    # Always return 200 to avoid user enumeration
    if user and not user.email_verified:
        token = _gen_token()
        await _store_token(redis, VERIFY_PREFIX, token, user.id, settings.EMAIL_VERIFICATION_EXPIRE_MINUTES)
        await redis.setex(cooldown_key, settings.EMAIL_VERIFICATION_EXPIRE_MINUTES * 60, "1")
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        await send_email(user.email, "Xác thực tài khoản KNOT", verification_email(user.full_name, verify_url))

    return {"message": "Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi lại email."}


# ──────────────────────────────────────────────────────────────────────────────
# Forgot / Reset Password
# ──────────────────────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    redis = await get_redis()
    # Rate limit
    cooldown_key = f"forgot_cooldown:{body.email}"
    if await redis.exists(cooldown_key):
        raise HTTPException(status_code=429, detail="Vui lòng đợi trước khi thử lại")

    result = await db.execute(select(User).where(User.email == body.email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if user:
        token = _gen_token()
        await _store_token(redis, RESET_PREFIX, token, user.id, settings.RESET_TOKEN_EXPIRE_MINUTES)
        await redis.setex(cooldown_key, settings.RESET_TOKEN_EXPIRE_MINUTES * 60, "1")
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        await send_email(user.email, "Đặt lại mật khẩu KNOT", reset_password_email(user.full_name, reset_url))

    # Always return 200 – never leak if email exists
    return {"message": "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    redis = await get_redis()
    user_id = await _pop_token(redis, RESET_PREFIX, body.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    # Validate new password strength (reuse the pydantic validator inline)
    import re
    pattern = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};\'\":\\|,.<>/?]).{8,}$')
    if not pattern.match(body.new_password):
        raise HTTPException(status_code=422, detail="Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt")

    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập."}


# ──────────────────────────────────────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    if user.status != AccountStatus.active:
        status_msg = {
            AccountStatus.pending_verification: "Vui lòng kiểm tra email để xác thực tài khoản",
            AccountStatus.pending_approval:     "Tài khoản đang chờ phê duyệt từ quản trị viên",
            AccountStatus.rejected:             "Tài khoản bị từ chối. Vui lòng liên hệ hỗ trợ.",
            AccountStatus.suspended:            "Tài khoản đã bị vô hiệu hóa",
        }.get(user.status, "Tài khoản chưa được kích hoạt")
        raise HTTPException(status_code=403, detail=status_msg)

    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id)

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await log_activity("login", user_id=user.id, ip_address=request.client.host if request.client else None)

    response.set_cookie(
        key="refresh_token", value=refresh_token,
        httponly=True, secure=not settings.DEBUG,
        samesite="lax", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    return TokenResponse(access_token=access_token)


# ──────────────────────────────────────────────────────────────────────────────
# Refresh / Logout
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.get(User, payload["sub"])
    if not user or user.status != AccountStatus.active or user.deleted_at:
        raise HTTPException(status_code=401, detail="Tài khoản không hợp lệ hoặc đã bị khóa")
    new_access = create_access_token(user.id, user.role.value)
    new_refresh = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token", value=new_refresh,
        httponly=True, secure=not settings.DEBUG, samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    return TokenResponse(access_token=new_access)


@router.post("/logout")
async def logout(request: Request, response: Response, current_user=Depends(get_current_user)):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        redis = await get_redis()
        payload = decode_token(token)
        exp = payload.get("exp", 0)
        ttl = max(exp - int(datetime.now(timezone.utc).timestamp()), 1)
        await redis.setex(f"blacklist:{token}", ttl, "1")

    response.delete_cookie("refresh_token")
    await log_activity("logout", user_id=current_user.id)
    return {"message": "Đăng xuất thành công"}
