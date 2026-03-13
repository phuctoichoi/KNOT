-- ============================================================
-- KNOT Platform — Complete Database Initialization
-- This script loads the complete schema from db.sql
-- ============================================================

-- Load the complete KNOT schema
\i /docker-entrypoint-initdb.d/db.sql

-- Log completion
SELECT 'KNOT database schema loaded successfully!' as status;