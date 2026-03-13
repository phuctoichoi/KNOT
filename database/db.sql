-- ============================================================
-- KNOT Platform — Complete PostgreSQL + PostGIS Schema
-- Updated with all missing fields from User model
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum types
CREATE TYPE user_role AS ENUM ('citizen','volunteer','organization','moderator','admin');
CREATE TYPE account_status AS ENUM ('pending_verification','pending_approval','active','rejected','suspended');
CREATE TYPE disaster_type AS ENUM ('flood','landslide','storm','fire','earthquake','infrastructure','other');
CREATE TYPE report_type AS ENUM ('emergency','damage');
CREATE TYPE severity_level AS ENUM ('low','medium','high','critical');
CREATE TYPE report_status AS ENUM ('pending','verified','in_progress','resolved','rejected');
CREATE TYPE alert_severity AS ENUM ('info','warning','danger','critical');
CREATE TYPE zone_type AS ENUM ('flood','landslide','wildfire','storm','earthquake','other');
CREATE TYPE support_type AS ENUM ('food','water','medical','volunteers','equipment','other');
CREATE TYPE resource_status AS ENUM ('available','deployed','exhausted');
CREATE TYPE notification_type AS ENUM (
  'report_submitted','report_verified','report_in_progress','report_resolved',
  'report_rejected','alert','nearby_emergency','account_approved','account_rejected',
  'volunteer_response','system'
);
CREATE TYPE action_type AS ENUM (
  'user_register','user_approve','user_reject','user_disable','user_role_change',
  'report_submit','report_verify','report_reject','report_resolve',
  'alert_broadcast','zone_create','zone_update','support_offer_create',
  'resource_update','admin_action','login','logout'
);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $ LANGUAGE plpgsql;

-- users table with ALL fields from User model
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             VARCHAR(200) NOT NULL,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  phone                 VARCHAR(20),
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'citizen',
  status                account_status NOT NULL DEFAULT 'pending_verification',
  email_verified        BOOLEAN NOT NULL DEFAULT false,
  avatar_url            TEXT,
  organization_name     VARCHAR(300),
  province              VARCHAR(100),
  district              VARCHAR(100),
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,
  last_login_at         TIMESTAMP WITH TIME ZONE,
  last_password_change  TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_name_trgm ON users USING GIN (full_name gin_trgm_ops);
CREATE TRIGGER trg_users_upd BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- reports
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type   report_type NOT NULL,
  disaster_type disaster_type NOT NULL,
  severity      severity_level NOT NULL DEFAULT 'medium',
  title         VARCHAR(500) NOT NULL,
  description   TEXT NOT NULL,
  status        report_status NOT NULL DEFAULT 'pending',
  location      GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text  VARCHAR(500),
  province      VARCHAR(100),
  district      VARCHAR(100),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  submitted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at   TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_reports_location ON reports USING GIST(location);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_dtype ON reports(disaster_type);
CREATE INDEX idx_reports_province ON reports(province);
CREATE INDEX idx_reports_submitted_by ON reports(submitted_by);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_title_trgm ON reports USING GIN (title gin_trgm_ops);
CREATE TRIGGER trg_reports_upd BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- report_images
CREATE TABLE report_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  filename   VARCHAR(255),
  size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_report_images_report ON report_images(report_id);

-- alerts
CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(500) NOT NULL,
  title_en      VARCHAR(500),
  body          TEXT NOT NULL,
  body_en       TEXT,
  severity      alert_severity NOT NULL DEFAULT 'warning',
  disaster_type disaster_type,
  location      GEOGRAPHY(POINT, 4326),
  province      VARCHAR(100),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_alerts_active ON alerts(is_active, expires_at);
CREATE INDEX idx_alerts_province ON alerts(province);
CREATE TRIGGER trg_alerts_upd BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- disaster_zones
CREATE TABLE disaster_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(300) NOT NULL,
  zone_type   zone_type NOT NULL,
  severity    severity_level NOT NULL DEFAULT 'medium',
  description TEXT,
  polygon     GEOGRAPHY(POLYGON, 4326) NOT NULL,
  is_danger   BOOLEAN NOT NULL DEFAULT FALSE,
  is_spread   BOOLEAN NOT NULL DEFAULT FALSE,
  start_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time    TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_zones_polygon ON disaster_zones USING GIST(polygon);
CREATE INDEX idx_zones_type ON disaster_zones(zone_type);
CREATE TRIGGER trg_zones_upd BEFORE UPDATE ON disaster_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- support_offers
CREATE TABLE support_offers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  support_type support_type NOT NULL,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  location     GEOGRAPHY(POINT, 4326),
  address_text VARCHAR(500),
  province     VARCHAR(100),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  capacity     INTEGER,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_support_location ON support_offers USING GIST(location);
CREATE INDEX idx_support_org ON support_offers(org_id);
CREATE INDEX idx_support_active ON support_offers(is_active);
CREATE TRIGGER trg_support_upd BEFORE UPDATE ON support_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- resources
CREATE TABLE resources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type support_type NOT NULL,
  name          VARCHAR(300) NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0,
  unit          VARCHAR(50),
  status        resource_status NOT NULL DEFAULT 'available',
  deployed_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resources_org ON resources(org_id);
CREATE INDEX idx_resources_status ON resources(status);
CREATE TRIGGER trg_resources_upd BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- notifications
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             notification_type NOT NULL,
  title            VARCHAR(500) NOT NULL,
  body             TEXT,
  link             TEXT,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  related_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  related_alert_id  UUID REFERENCES alerts(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX idx_notif_created ON notifications(created_at DESC);

-- activity_logs
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type action_type NOT NULL,
  target_type VARCHAR(100),
  target_id   UUID,
  description TEXT,
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_logs_action ON activity_logs(action_type);
CREATE INDEX idx_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_logs_target ON activity_logs(target_type, target_id);

-- Insert sample admin user
