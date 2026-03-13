# KNOT - Disaster Response Platform

A comprehensive disaster reporting and relief coordination platform with real-time mapping, role-based dashboards, and emergency alert broadcasting.

## 🚀 Quick Deployment on Ubuntu VPS

### Prerequisites
- Fresh Ubuntu 22.04/24.04 VPS
- Docker and Docker Compose installed

### Installation

```bash
# 1. Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Install Docker Compose
sudo apt install docker-compose-plugin -y

# 3. Clone repository
git clone https://github.com/phuctoichoi/KNOT.git
cd KNOT

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your values

# 5. Deploy
docker compose up -d
```

### Environment Configuration

Edit `.env` with your production values:

```env
# Database
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# Application Security (generate with: openssl rand -hex 32)
SECRET_KEY=your_secret_key

# MinIO Storage
MINIO_ACCESS_KEY=your_minio_user
MINIO_SECRET_KEY=your_minio_password

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=your_email@gmail.com

# Frontend URLs
FRONTEND_URL=http://your-domain.com
FRONTEND_WS_URL=ws://your-domain.com
```

### Access Points

- **Frontend**: http://your-server-ip
- **Backend API**: http://your-server-ip:8000/docs
- **MinIO Console**: http://your-server-ip:9001

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | React application |
| Backend | 8000 | FastAPI server |
| PostgreSQL | 5432 | Database (internal) |
| MinIO API | 9000 | Object storage |
| MinIO Console | 9001 | Storage admin UI |

### Management Commands

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down

# Update deployment
git pull
docker compose up -d --build

# Database backup
docker compose exec postgres pg_dump -U knot knot_db > backup.sql

# Clean restart (removes all data)
docker compose down -v
docker compose up -d
```

### Database Schema

The application uses a complete PostgreSQL + PostGIS schema that is automatically initialized from `database/db.sql`. No migrations are required - the database is ready to use immediately after deployment.

### Architecture

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Redis
- **Storage**: MinIO (S3-compatible)
- **Database**: PostgreSQL 16 + PostGIS
- **Deployment**: Docker Compose

### Troubleshooting

```bash
# Check service health
docker compose ps

# View specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Test backend health
curl http://localhost:8000/api/health

# Reset everything (WARNING: removes all data)
docker compose down -v
docker compose up -d
```