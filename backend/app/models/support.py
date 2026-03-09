import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Enum, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from app.core.database import Base, TimestampMixin


class SupportType(str, enum.Enum):
    food = "food"
    water = "water"
    medical = "medical"
    volunteers = "volunteers"
    equipment = "equipment"
    other = "other"


class ResourceStatus(str, enum.Enum):
    available = "available"
    deployed = "deployed"
    exhausted = "exhausted"


class SupportOffer(Base, TimestampMixin):
    __tablename__ = "support_offers"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    support_type: Mapped[SupportType] = mapped_column(Enum(SupportType, name="support_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[Optional[object]] = mapped_column(Geography("POINT", srid=4326))
    address_text: Mapped[Optional[str]] = mapped_column(String(500))
    province: Mapped[Optional[str]] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    capacity: Mapped[Optional[int]] = mapped_column(Integer)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    organization: Mapped["User"] = relationship("User", back_populates="support_offers")


class Resource(Base, TimestampMixin):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_type: Mapped[SupportType] = mapped_column(Enum(SupportType, name="support_type"), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[ResourceStatus] = mapped_column(Enum(ResourceStatus, name="resource_status"), nullable=False, default=ResourceStatus.available)
    deployed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    organization: Mapped["User"] = relationship("User", back_populates="resources")


class ReliefPost(Base, TimestampMixin):
    __tablename__ = "relief_posts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    route: Mapped[Optional[str]] = mapped_column(String(500))
    province: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    district: Mapped[Optional[str]] = mapped_column(String(100))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20))
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    organization: Mapped["User"] = relationship("User", back_populates="relief_posts")
