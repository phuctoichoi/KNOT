#!/bin/bash

echo "🏥 KNOT Health Check"
echo "===================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service=$1
    local url=$2
    local name=$3
    
    echo -n "Checking $name... "
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

# Check Docker Compose services
echo -e "\n📋 Docker Services Status:"
docker compose ps

echo -e "\n🔍 Service Health Checks:"

# Check each service
check_service "frontend" "http://localhost:80/health" "Frontend (React)"
check_service "backend" "http://localhost:8000/api/health" "Backend (FastAPI)"
check_service "minio" "http://localhost:9000/minio/health/live" "MinIO Storage"

echo -e "\n📊 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo -e "\n📝 Recent Logs (last 10 lines):"
echo "Backend:"
docker compose logs --tail=5 backend

echo -e "\nFrontend:"
docker compose logs --tail=5 frontend

echo -e "\n✅ Health check complete!"