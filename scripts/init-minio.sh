#!/bin/bash

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until curl -f http://minio:9000/minio/health/live; do
    echo "MinIO is not ready yet. Waiting..."
    sleep 5
done

echo "MinIO is ready. Creating bucket..."

# Install MinIO client
curl -o /tmp/mc https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x /tmp/mc

# Configure MinIO client
/tmp/mc alias set minio http://minio:9000 ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}

# Create bucket if it doesn't exist
/tmp/mc mb minio/knot-images --ignore-existing

# Set bucket policy to public read
/tmp/mc anonymous set public minio/knot-images

echo "MinIO bucket 'knot-images' created and configured successfully!"