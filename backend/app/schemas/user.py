from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from app.models.user import UserRole, AccountStatus


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role: UserRole = UserRole.citizen
    organization_name: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        import re
        pattern = re.compile(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};\'":\\|,.<>/?]).{8,}$'
        )
        if not pattern.match(v):
            raise ValueError(
                "Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt"
            )
        return v

    @field_validator("full_name", "organization_name", "province", "district", mode="before")
    @classmethod
    def sanitize(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import bleach
        return bleach.clean(str(v), tags=[], strip=True).strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    role: UserRole
    status: AccountStatus
    email_verified: bool = False
    organization_name: Optional[str] = None
    province: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime


class UserMe(UserPublic):
    phone: Optional[str] = None
    district: Optional[str] = None
    last_login_at: Optional[datetime] = None
    last_password_change: Optional[datetime] = None

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        import re
        pattern = re.compile(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};\'":\\|,.<>/?]).{8,}$'
        )
        if not pattern.match(v):
            raise ValueError(
                "Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt"
            )
        return v



class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organization_name: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None


class UserStatusUpdate(BaseModel):
    status: AccountStatus
    reason: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    items: List[UserPublic]
    total: int
    page: int
    limit: int
