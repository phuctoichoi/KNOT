# KNOT - Disaster Response Platform

A comprehensive disaster reporting and relief coordination platform with real-time mapping, role-based dashboards, and emergency alert broadcasting.

## 🚀 Production Deployment on Ubuntu VPS

Complete deployment guide for **knot.name.vn** (IP: 14.225.212.229)

### Server Information
- **Domain**: knot.name.vn
- **IP Address**: 14.225.212.229
- **OS**: Ubuntu 22.04/24.04

### Step 1: Prepare Ubuntu VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Git (if not installed)
sudo apt install git -y

# Logout and login again for Docker group changes
exit
# SSH back into your VPS
```

### Step 2: Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/phuctoichoi/KNOT.git
cd KNOT

# Copy environment template
cp .env.example .env
```

### Step 3: Configure Environment Variables

Edit the `.env` file with production values:

```bash
nano .env
```

**Complete .env configuration for knot.name.vn:**

```env
# Database Configuration
POSTGRES_PASSWORD=KnotSecureDB2024!

# Redis Configuration  
REDIS_PASSWORD=KnotRedis2024!

# Application Security (generate with: openssl rand -hex 32)
SECRET_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# MinIO Object Storage
MINIO_ACCESS_KEY=knotminio
MINIO_SECRET_KEY=KnotMinIO2024!

# Email Configuration (replace with your Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
FROM_EMAIL=your_email@gmail.com

# Frontend Configuration
FRONTEND_URL=http://knot.name.vn
FRONTEND_WS_URL=ws://knot.name.vn
```

### Step 4: Deploy Application

```bash
# Start all services with automatic migrations
docker compose up -d --build

# Check deployment status
docker compose ps

# View logs to ensure everything is working
docker compose logs -f
```

### Step 5: Verify Deployment

Access your application:
- **Main Website**: http://knot.name.vn
- **Backend API**: http://knot.name.vn:8000/docs
- **MinIO Console**: http://knot.name.vn:9001

### Step 6: Create Admin User (Optional)

```bash
# Create admin user
docker compose exec backend python scripts/create_admin.py
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