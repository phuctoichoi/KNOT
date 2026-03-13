# KNOT System Overview

KNOT is a comprehensive Disaster Reporting and Relief Coordination Platform designed to provide real-time information and facilitate assistance during natural disasters.

---

# 1. Project Overview
- **Purpose**: A crowdsourced disaster reporting system that visualizes incidents on a real-time map, coordinates relief efforts from organizations/volunteers, and broadcasts emergency alerts.
- **Main Users**:
    - **Citizens**: Report disasters, view maps, receive alerts.
    - **Volunteers**: Verify reports, assist in relief actions.
    - **Organizations**: Post relief notices, coordinate aid, manage resources.
    - **Moderators**: Approve accounts, manage content, verify critical reports.
    - **Admins**: System management, analytics, global alerts.
- **Main Functions**:
    - Real-time disaster mapping (Emergency vs. Damage reports).
    - User-submitted reports with images and location data.
    - Role-based dashboard system for specialized workflows.
    - Broadcast alert system (Critical/Danger/Warning/Info).
    - Activity logging and audit trails.
    - Multilingual support (Vietnamese & English).

# 2. Tech Stack
- **Frontend**:
    - Framework: React 18 (Vite + TypeScript)
    - UI Libraries: Tailwind CSS, Radix UI, Lucide React
    - Map: React Leaflet (Leaflet.js)
    - Data Fetching: TanStack Query v5 (React Query), Axios
    - Form Management: React Hook Form + Zod
    - State Management: Zustand (Auth state)
    - Charts: Recharts
    - i18n: react-i18next
- **Backend**:
    - Framework: FastAPI (Python 3.10+)
    - ORM: SQLAlchemy v2 (Async)
    - Database Schema: Static SQL initialization (PostgreSQL + PostGIS)
    - Spatial Extension: GeoAlchemy2 (PostGIS)
    - Validation: Pydantic v2
- **Database**: PostgreSQL (with PostGIS extension)
- **Storage**: MinIO (S3 compatible object storage)
- **Authentication**: JWT (JSON Web Tokens) with `python-jose`
- **Email Service**: SMTP (`aiosmtplib`)
- **Other Services**:
    - Redis: Caching, token storage (verification/reset), rate limiting.
    - Slowapi: Rate limiting logic.
    - Tenacity: Robust retry logic for external services.

# 3. Project Structure
```text
knot/
├── backend/            # FastAPI source code
│   ├── app/            # Main application package
│   │   ├── api/        # REST API endpoints (v1)
│   │   ├── core/       # Security, Config, Database, Storage, Email
│   │   ├── models/     # SQLAlchemy database models
│   │   ├── schemas/    # Pydantic data schemas
│   │   ├── services/   # Business logic layer
│   │   └── websockets/ # Real-time communication
├── frontend/           # React source code
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── i18n/       # Translations (en/vi)
│   │   ├── pages/      # Route pages (public & dashboard)
│   │   ├── services/   # API client modules
│   │   └── store/      # Global state (Zustand)
├── database/           # SQL schema and initialization scripts
├── infrastructure/     # Deployment configs (Docker, Nginx)
```

# 4. Frontend Architecture
- **Framework**: React with Vite for fast HMR and optimized builds.
- **Routing Structure**: `react-router-dom` with a central router and role-based redirects.
- **State Management**: Zustand for lightweight global state (authentication) and TanStack Query for server-side state (caching/sync).
- **API Calling Pattern**: Centralized Axios instance with interceptors for auth headers and error handling.
- **i18n**: Integrated `react-i18next` with locales in `JSON` format.
- **Theme**: Full Dark/Light mode support using Tailwind CSS `dark:` variant and CSS variables.

# 5. Backend Architecture
- **Framework**: FastAPI for high performance and automatic OpenAPI documentation.
- **API Organization**: Modular routers under `app/api/v1/`, separated by domain (auth, reports, users, etc.).
- **Authentication Flow**:
    - Login -> JWT Access Token (expires soon) + Refresh Token.
    - Tokens are stored in HTTP-only cookies or Bearer headers.
- **Service Layer**: Decoupled business logic in `app/services/` (e.g., storage_service, email_service).
- **Database Models**: SQLAlchemy Declarative models with `TimestampMixin` for audit fields.

# 6. Database Design
- **Users**: Identity management, role-based statuses, location (province/district).
- **Reports**: Stores disaster metadata and spatial coordinates (`location` point).
- **ReportImages**: Links uploaded image URLs from MinIO to specific reports.
- **Alerts**: System-wide notifications with levels (Critical to Info).
- **SupportPosts**: Relief notices posted by organizations (Aid, Volunteering).
- **ActivityLogs**: Exhaustive audit trail of all system mutations.
- **Notifications**: In-app notifications for users.
- **Zones**: Defined safety or danger zones (Geospatial polygons).

# 7. Storage System
- **Provider**: MinIO (local) or AWS S3 (production).
- **Security Check**: Server-side MIME validation using `python-magic` to prevent file type spoofing.
- **Workflow**: Files are uploaded directly to backend -> Processed/Validated -> Uploaded to S3/MinIO bucket -> Public URL stored in DB.

# 8. API Overview (v1)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/v1/auth/register` | User registration (Email verification sent) |
| POST | `/api/v1/auth/login` | Authentication & token issuance |
| GET | `/api/v1/reports` | List/Filter reports (Geo-search supported) |
| POST | `/api/v1/reports` | Submit a new disaster report |
| GET | `/api/v1/map-data` | Aggregated report dots/heatmaps for Leaflet |
| POST | `/api/v1/alerts` | Create a system-wide broadcast (Admin only) |
| GET | `/api/v1/users/me` | Current user profile |

# 9. Environment Variables
Stored in `backend/.env` and `frontend/.env`.
- `DATABASE_URL`: Postgres connection string.
- `REDIS_URL`: Redis connection string.
- `SECRET_KEY`: JWT signing key.
- `STORAGE_PROVIDER`: `minio` or `aws`.
- `MINIO_ENDPOINT`, `MINIO_BUCKET`: Storage settings.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email config.
- `FRONTEND_URL`: Used for verification links.

# 10. Security
- **Authentication**: Stateless JWT with secure signing via `jose`.
- **Authorization**: Granular Role-Based Access Control (RBAC) via FastAPI dependencies.
- **Input Validation**: Strict schema enforcement using Pydantic (Backend) and Zod (Frontend).
- **File Upload Security**: Max file size checks, server-side MIME detection, unique filename generation.
- **Email Verification**: Required for account activation to prevent bot registrations.

# 11. Main Workflows
### **Disaster Reporting**
1. User identifies disaster -> Hits "Report" button.
2. Form captures: Disaster Type, Level, Coordinates (via click), Photos.
3. Backend validates input -> Detects real image types -> Uploads to MinIO.
4. Data saved to Postgres -> WebSocket broadcast to all active users' maps.
5. Email notification sent to the reporter.

### **Organization Onboarding**
1. Org registers account -> Submits documents/credentials.
2. System sends verification email.
3. Account stays in `pending_approval` status.
4. Moderator/Admin reviews records -> Approves -> User receives "Approved" email.

# 12. Known Limitations / TODO
- [ ] Real-time chat between users/volunteers.
- [ ] Offline support for mapping (Tile caching).
- [ ] Advanced AI image classification for report verification.
- [ ] Mobile application (iOS/Android).
