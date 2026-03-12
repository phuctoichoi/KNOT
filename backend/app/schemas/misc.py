from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator, ConfigDict
from app.models.report import DisasterType
from app.models.alert import AlertSeverity


class AlertCreate(BaseModel):
    title: str
    title_en: Optional[str] = None
    body: str
    body_en: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.warning
    disaster_type: Optional[DisasterType] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    province: Optional[str] = None
    expires_at: Optional[datetime] = None

    @field_validator("title", "body", "title_en", "body_en", mode="before")
    @classmethod
    def sanitize(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import bleach
        return bleach.clean(str(v), tags=[], strip=True).strip()


class AlertPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    title_en: Optional[str] = None
    body: str
    body_en: Optional[str] = None
    severity: AlertSeverity
    disaster_type: Optional[DisasterType] = None
    province: Optional[str] = None
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    # Author info loaded by API
    author_name: Optional[str] = None
    author_role: Optional[str] = None


class ZoneCreate(BaseModel):
    name: str
    zone_type: str
    severity: str = "medium"
    description: Optional[str] = None
    coordinates: List[List[float]]  # [[lng, lat], ...]
    is_danger: bool = False
    is_spread: bool = False
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class ZonePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    zone_type: str
    severity: str
    description: Optional[str] = None
    is_danger: bool
    is_spread: bool
    start_time: datetime
    end_time: Optional[datetime] = None


class SupportOfferCreate(BaseModel):
    support_type: str
    title: str
    description: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address_text: Optional[str] = None
    province: Optional[str] = None
    capacity: Optional[int] = None
    expires_at: Optional[datetime] = None


class SupportOfferPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    org_id: str
    support_type: str
    title: str
    description: Optional[str] = None
    address_text: Optional[str] = None
    province: Optional[str] = None
    is_active: bool
    capacity: Optional[int] = None
    expires_at: Optional[datetime] = None
    created_at: datetime


class ResourceCreate(BaseModel):
    resource_type: str
    name: str
    quantity: int
    unit: Optional[str] = None
    notes: Optional[str] = None


class ResourcePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    org_id: str
    resource_type: str
    name: str
    quantity: int
    unit: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    related_report_id: Optional[str] = None
    related_alert_id: Optional[str] = None
    created_at: datetime


class ReliefPostCreate(BaseModel):
    title: str
    content: str
    route: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    @field_validator("title", "content", "route", mode="before")
    @classmethod
    def sanitize(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import bleach
        return bleach.clean(str(v), tags=[], strip=True).strip()


class ReliefPostPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    org_id: str
    title: str
    content: str
    route: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    # Org info loaded by API
    org_name: Optional[str] = None
    org_id_str: Optional[str] = None

