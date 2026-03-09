import asyncio
import random
from datetime import datetime, timezone, timedelta
from app.core.database import AsyncSessionLocal
from app.models.report import Report, ReportType, DisasterType, SeverityLevel, ReportStatus

async def seed_reports():
    async with AsyncSessionLocal() as db:
        reports_data = [
            # Emergency Reports
            {"title": "Ngập cục bộ tại Hải Châu", "report_type": ReportType.emergency, "disaster_type": DisasterType.flood, "severity": SeverityLevel.critical, "lat": 16.0544, "lng": 108.2022, "address": "Quận Hải Châu, Đà Nẵng"},
            {"title": "Sạt lở đất đèo Hải Vân", "report_type": ReportType.emergency, "disaster_type": DisasterType.landslide, "severity": SeverityLevel.high, "lat": 16.1911, "lng": 108.1340, "address": "Đèo Hải Vân, Đà Nẵng"},
            {"title": "Kêu gọi cứu hộ khu vực Hòa Quý", "report_type": ReportType.emergency, "disaster_type": DisasterType.storm, "severity": SeverityLevel.medium, "lat": 15.9867, "lng": 108.2619, "address": "Phường Hòa Quý, Đà Nẵng"},
            {"title": "Sập nhà dân do bão", "report_type": ReportType.emergency, "disaster_type": DisasterType.storm, "severity": SeverityLevel.critical, "lat": 16.0680, "lng": 108.1820, "address": "Quận Thanh Khê, Đà Nẵng"},
            {"title": "Cháy trạm biến áp", "report_type": ReportType.emergency, "disaster_type": DisasterType.fire, "severity": SeverityLevel.high, "lat": 16.0350, "lng": 108.2120, "address": "Quận Cẩm Lệ, Đà Nẵng"},
            
            # Damage Reports
            {"title": "Cột điện gãy đổ", "report_type": ReportType.damage, "disaster_type": DisasterType.infrastructure, "severity": SeverityLevel.high, "lat": 16.0600, "lng": 108.2200, "address": "Đường Lê Duẩn, Đà Nẵng"},
            {"title": "Đường hỏng nặng do sạt lở", "report_type": ReportType.damage, "disaster_type": DisasterType.infrastructure, "severity": SeverityLevel.medium, "lat": 16.1000, "lng": 108.1200, "address": "Quận Liên Chiểu, Đà Nẵng"},
            {"title": "Mái tôn bay vướng dây điện", "report_type": ReportType.damage, "disaster_type": DisasterType.storm, "severity": SeverityLevel.medium, "lat": 16.0120, "lng": 108.2300, "address": "Phường Hòa Xuân, Đà Nẵng"},
            {"title": "Cây đè bẹp ô tô", "report_type": ReportType.damage, "disaster_type": DisasterType.infrastructure, "severity": SeverityLevel.low, "lat": 16.0750, "lng": 108.2150, "address": "Đường Nguyễn Tất Thành, Đà Nẵng"},
            {"title": "Đá lở chặn ngang quốc lộ", "report_type": ReportType.damage, "disaster_type": DisasterType.landslide, "severity": SeverityLevel.critical, "lat": 16.1800, "lng": 108.1000, "address": "Quốc lộ 1A, Đà Nẵng"},
        ]

        # Use an existing user id or None
        # Assuming admin has id 'admin' for mock purposes if foreign keys are relaxed,
        # otherwise we grab any user
        from sqlalchemy import select
        from app.models.user import User
        user = await db.scalar(select(User).limit(1))
        user_id = user.id if user else None

        for data in reports_data:
            report = Report(
                submitted_by=user_id,
                report_type=data["report_type"],
                disaster_type=data["disaster_type"],
                severity=data["severity"],
                status=ReportStatus.verified,
                title=data["title"],
                contact_email="tester@knot.vn",
                description="Báo cáo thử nghiệm tự động tạo (Mock data)",
                location=f"POINT({data['lng']} {data['lat']})",
                address_text=data["address"],
                province="Đà Nẵng",
                created_at=datetime.now(timezone.utc) - timedelta(minutes=random.randint(1, 100))
            )
            db.add(report)
        
        await db.commit()
        print("Đã tạo thành công 10 báo cáo mẫu (5 Khẩn cấp, 5 Hậu thiên tai).")

if __name__ == "__main__":
    asyncio.run(seed_reports())
