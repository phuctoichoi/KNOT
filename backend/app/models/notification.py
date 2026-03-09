import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Enum, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class NotificationType(str, enum.Enum):
    report_submitted = "report_submitted"
    report_verified = "report_verified"
    report_in_progress = "report_in_progress"
    report_resolved = "report_resolved"
    report_rejected = "report_rejected"
    alert = "alert"
    nearby_emergency = "nearby_emergency"
    account_approved = "account_approved"
    account_rejected = "account_rejected"
    volunteer_response = "volunteer_response"
    system = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    link: Mapped[Optional[str]] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    related_report_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("reports.id", ondelete="SET NULL"))
    related_alert_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("alerts.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship("User", back_populates="notifications")
    related_report: Mapped[Optional["Report"]] = relationship("Report", back_populates="notifications")
    related_alert: Mapped[Optional["Alert"]] = relationship("Alert", back_populates="notifications")
