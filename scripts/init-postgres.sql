-- ============================================================
-- KNOT Platform — PostgreSQL + PostGIS Extensions Only
-- This script only creates extensions, schema will be created by Alembic
-- ============================================================

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Log completion
SELECT 'PostgreSQL extensions created successfully!' as status;