from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "KNOT"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str = "http://localhost"
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 15
    RESET_TOKEN_EXPIRE_MINUTES: int = 15

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://knot:knotpassword@postgres:5432/knot_db"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Storage
    STORAGE_PROVIDER: str = "minio"
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minio_access_key"
    MINIO_SECRET_KEY: str = "minio_secret_key"
    MINIO_BUCKET: str = "knot-images"
    MINIO_SECURE: bool = False
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "ap-southeast-1"

    # Email
    EMAIL_PROVIDER: str = "smtp"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@knot.vn"
    SENDGRID_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost"]

    # Rate limits
    RATE_LIMIT_DEFAULT: str = "200/minute"
    RATE_LIMIT_REPORT_SUBMIT: str = "10/minute"
    RATE_LIMIT_AUTH: str = "5/minute"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
