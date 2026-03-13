# KNOT - Disaster Response Platform

A comprehensive disaster reporting and relief coordination platform with real-time mapping, role-based dashboards, and emergency alert broadcasting.

## Quick Deployment on Ubuntu

### Prerequisites

1. **Fresh Ubuntu 22.04/24.04 VPS**
2. **Docker & Docker Compose**

### Installation Steps

#### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

#### 2. Deploy KNOT

```bash
# Clone repository
git clone <your-repo-url>
cd knot

# Copy environment template
cp .env.example .env

# Edit environment variables (REQUIRED)
nano .env
```

#### 3. Configure Environment Variables

Edit `.env` file with your values:

```bash
# Database - Use a strong password
POSTGRES_PASSWORD=your_secure_postgres_password

# Redis - Use a strong password  
REDIS_PASSWORD=your_secure_redis_password

# Application Security - Generate with: openssl rand -hex 32
SECRET_KEY=your_64_character_secret_key

# MinIO Storage
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key_min_8_chars

# Email (Gmail App Password recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
FROM_EMAIL=your_email@gmail.com

# Frontend URLs
FRONTEND_URL=http://your-server-ip
FRONTEND_WS_URL=ws://your-server-ip
```

#### 4. Start the System

**Option 1: Using Alembic Migrations (Recommended)**
```bash
# Start all services with automatic migrations
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Check migration status (optional)
docker compose exec backend alembic current
```

**Option 2: Using database/db.sql Schema**
```bash
# Start with pre-built database schema
docker compose -f docker-compose.db-sql.yml up -d

# Check status
docker compose -f docker-compose.db-sql.yml ps
```

**Note**: 
- **Option 1** runs Alembic migrations automatically on startup (recommended for production)
- **Option 2** uses the static `database/db.sql` file and marks migrations as complete

#### 5. Initialize MinIO Bucket (Optional)

```bash
# Make script executable
chmod +x scripts/init-minio.sh

# Run initialization
docker run --rm --network knot_knot-network \
  -e MINIO_ACCESS_KEY=your_minio_access_key \
  -e MINIO_SECRET_KEY=your_minio_secret_key \
  -v $(pwd)/scripts:/scripts \
  alpine:latest sh /scripts/init-minio.sh
```

### Access the Application

- **Frontend**: http://your-server-ip
- **Backend API**: http://your-server-ip:8000/api/docs
- **MinIO Console**: http://your-server-ip:9001

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | React application |
| Backend | 8000 | FastAPI server |
| PostgreSQL | 5432 | Database (internal) |
| MinIO API | 9000 | Object storage |
| MinIO Console | 9001 | Storage admin UI |

### Health Checks

```bash
# Check all services
docker compose ps

# Test backend health
curl http://localhost:8000/api/health

# Test frontend
curl http://localhost:80

# Check logs
docker compose logs backend
docker compose logs frontend
```

### Management Commands

```bash
# Stop services
docker compose down

# Update and restart
git pull
docker compose build --no-cache
docker compose up -d

# View logs
docker compose logs -f [service_name]

# Run database migrations manually (if needed)
docker compose exec backend alembic upgrade head

# Check migration status
docker compose exec backend alembic current

# Create new migration (development)
docker compose exec backend alembic revision --autogenerate -m "description"

# Database backup
docker compose exec postgres pg_dump -U knot knot_db > backup.sql

# Restore database
docker compose exec -T postgres psql -U knot knot_db < backup.sql

# Clean up
docker compose down -v  # WARNING: Removes all data
```

### Troubleshooting

#### Common Issues

1. **Services not starting**: Check logs with `docker compose logs [service]`
2. **Database connection failed**: Ensure PostgreSQL is healthy
3. **MinIO bucket errors**: Run the bucket initialization script
4. **CORS errors**: Check FRONTEND_URL in environment variables

#### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v
docker system prune -a

# Start fresh
docker compose up -d
```

### Production Considerations

For production deployment:

1. **Use HTTPS**: Set up SSL certificates and reverse proxy
2. **Secure passwords**: Use strong, unique passwords for all services
3. **Backup strategy**: Regular database and MinIO backups
4. **Monitoring**: Set up logging and monitoring
5. **Updates**: Regular security updates for base images
6. **Firewall**: Restrict access to necessary ports only

### Architecture

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Redis
- **Storage**: MinIO (S3-compatible)
- **Database**: PostgreSQL 16 + PostGIS
- **Deployment**: Docker Compose

### Support

For issues and questions:
1. Check the logs: `docker compose logs`
2. Verify environment variables in `.env`
3. Ensure all services are healthy: `docker compose ps`