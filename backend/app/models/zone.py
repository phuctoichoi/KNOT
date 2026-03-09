import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Enum, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from app.core.database import Base, TimestampMixin
from app.models.report import SeverityLevel


class ZoneType(str, enum.Enum):
    flood = "flood"
    landslide = "landslide"
    wildfire = "wildfire"
    storm = "storm"
    earthquake = "earthquake"
    other = "other"


class DisasterZone(Base, TimestampMixin):
    __tablename__ = "disaster_zones"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    zone_type: Mapped[ZoneType] = mapped_column(Enum(ZoneType, name="zone_type"), nullable=False)
    severity: Mapped[SeverityLevel] = mapped_column(Enum(SeverityLevel, name="severity_level"), nullable=False, default=SeverityLevel.medium)
    description: Mapped[Optional[str]] = mapped_column(Text)
    polygon: Mapped[object] = mapped_column(Geography("POLYGON", srid=4326), nullable=False)
    is_danger: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_spread: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
