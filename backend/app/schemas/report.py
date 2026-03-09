from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from app.models.report import DisasterType, ReportType, SeverityLevel, ReportStatus


class ReportCreate(BaseModel):
    report_type: ReportType
    disaster_type: DisasterType
    severity: SeverityLevel = SeverityLevel.medium
    title: str
    description: str
    lat: float
    lng: float
    address_text: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None

    @field_validator("title", "description", "address_text", mode="before")
    @classmethod
    def sanitize(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import bleach
        return bleach.clean(str(v), tags=[], strip=True).strip()

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if not (-90 <= v <= 90):
            raise ValueError("Latitude phải trong khoảng -90 đến 90")
        return v

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v: float) -> float:
        if not (-180 <= v <= 180):
            raise ValueError("Longitude phải trong khoảng -180 đến 180")
        return v


class ReportStatusUpdate(BaseModel):
    status: ReportStatus
    reason: Optional[str] = None


class ReportImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    url: str
    filename: Optional[str] = None


class ReportPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    report_type: ReportType
    disaster_type: DisasterType
    severity: SeverityLevel
    title: str
    description: str
    status: ReportStatus
    address_text: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    submitted_by: Optional[str] = None
    images: List[ReportImageOut] = []
    created_at: datetime
    updated_at: datetime


class ReportListResponse(BaseModel):
    items: List[ReportPublic]
    total: int
    page: int
    limit: int


class MapMarker(BaseModel):
    id: str
    report_type: ReportType
    disaster_type: DisasterType
    severity: SeverityLevel
    status: ReportStatus
    title: str
    lat: float
    lng: float
    created_at: datetime
