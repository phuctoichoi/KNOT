import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, INET
from app.core.database import Base


class ActionType(str, enum.Enum):
    user_register = "user_register"
    user_approve = "user_approve"
    user_reject = "user_reject"
    user_disable = "user_disable"
    user_role_change = "user_role_change"
    report_submit = "report_submit"
    report_verify = "report_verify"
    report_reject = "report_reject"
    report_resolve = "report_resolve"
    alert_broadcast = "alert_broadcast"
    zone_create = "zone_create"
    zone_update = "zone_update"
    support_offer_create = "support_offer_create"
    resource_update = "resource_update"
    admin_action = "admin_action"
    login = "login"
    logout = "logout"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action_type: Mapped[ActionType] = mapped_column(Enum(ActionType, name="action_type"), nullable=False, index=True)
    target_type: Mapped[Optional[str]] = mapped_column(String(100))
    target_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    description: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
