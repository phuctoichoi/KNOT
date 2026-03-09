import uuid
import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Enum, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, INET
from app.core.database import Base, TimestampMixin


class UserRole(str, enum.Enum):
    citizen = "citizen"
    volunteer = "volunteer"
    organization = "organization"
    moderator = "moderator"
    admin = "admin"


class AccountStatus(str, enum.Enum):
    pending_verification = "pending_verification"
    pending_approval = "pending_approval"
    active = "active"
    rejected = "rejected"
    suspended = "suspended"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False, default=UserRole.citizen)
    status: Mapped[AccountStatus] = mapped_column(Enum(AccountStatus, name="account_status"), nullable=False, default=AccountStatus.pending_verification)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    organization_name: Mapped[Optional[str]] = mapped_column(String(300))
    province: Mapped[Optional[str]] = mapped_column(String(100))
    district: Mapped[Optional[str]] = mapped_column(String(100))
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_password_change: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    reports: Mapped[List["Report"]] = relationship("Report", foreign_keys="Report.submitted_by", back_populates="submitter")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")
    support_offers: Mapped[List["SupportOffer"]] = relationship("SupportOffer", back_populates="organization")
    resources: Mapped[List["Resource"]] = relationship("Resource", back_populates="organization")
    relief_posts: Mapped[List["ReliefPost"]] = relationship("ReliefPost", back_populates="organization")
