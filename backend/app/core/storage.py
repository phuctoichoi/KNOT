import io
import uuid
from typing import Optional
from app.core.config import settings


def _get_minio_client():
    from minio import Minio
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )


def _get_s3_client():
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


async def upload_image(file_bytes: bytes, content_type: str, filename: Optional[str] = None) -> str:
    """Upload an image and return its public URL."""
    ext = (filename or "image.jpg").rsplit(".", 1)[-1].lower()
    key = f"reports/{uuid.uuid4()}.{ext}"

    if settings.STORAGE_PROVIDER == "minio":
        client = _get_minio_client()
        bucket = settings.MINIO_BUCKET
        # Ensure bucket exists
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
        client.put_object(
            bucket, key,
            data=io.BytesIO(file_bytes),
            length=len(file_bytes),
            content_type=content_type,
        )
        proto = "https" if settings.MINIO_SECURE else "http"
        return f"{proto}://{settings.MINIO_ENDPOINT}/{bucket}/{key}"

    elif settings.STORAGE_PROVIDER == "s3":
        client = _get_s3_client()
        client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

    raise ValueError(f"Unknown storage provider: {settings.STORAGE_PROVIDER}")


async def delete_image(url: str) -> None:
    """Delete an image by URL (best-effort)."""
    try:
        if settings.STORAGE_PROVIDER == "minio":
            client = _get_minio_client()
            bucket = settings.MINIO_BUCKET
            # Extract key from URL
            key = url.split(f"/{bucket}/", 1)[-1]
            client.remove_object(bucket, key)
        elif settings.STORAGE_PROVIDER == "s3":
            client = _get_s3_client()
            key = url.split(".amazonaws.com/", 1)[-1]
            client.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
    except Exception:
        pass  # Don't fail the request if image deletion fails
