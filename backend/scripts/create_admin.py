"""
Script tạo tài khoản admin local.
Chạy từ thư mục backend: python scripts/create_admin.py
"""
import asyncio
import bcrypt
import sys
import os

# Thêm backend vào path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from app.core.config import settings

EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@knot.vn")
PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123!")
NAME     = os.getenv("ADMIN_NAME",     "System Admin")

async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    pw_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(12)).decode()
    async with AsyncSession(engine) as session:
        await session.execute(text("""
            INSERT INTO users (full_name, email, password_hash, role, status)
            VALUES (:name, :email, :hash, 'admin', 'approved')
            ON CONFLICT (email) DO UPDATE
              SET password_hash = :hash,
                  role = 'admin',
                  status = 'approved'
        """), {"name": NAME, "email": EMAIL, "hash": pw_hash})
        await session.commit()
    print(f"✅ Admin created!")
    print(f"   Email   : {EMAIL}")
    print(f"   Password: {PASSWORD}")
    await engine.dispose()

asyncio.run(main())
