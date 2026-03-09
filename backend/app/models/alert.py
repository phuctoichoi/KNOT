import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Enum, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from app.core.database import Base, TimestampMixin
from app.models.report import DisasterType


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    danger = "danger"
    critical = "critical"


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    title_en: Mapped[Optional[str]] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    body_en: Mapped[Optional[str]] = mapped_column(Text)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity, name="alert_severity"), nullable=False, default=AlertSeverity.warning)
    disaster_type: Mapped[Optional[DisasterType]] = mapped_column(Enum(DisasterType, name="disaster_type"))
    location: Mapped[Optional[object]] = mapped_column(Geography("POINT", srid=4326))
    province: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    notifications: Mapped[list] = relationship("Notification", back_populates="related_alert")
