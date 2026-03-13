#!/usr/bin/env python3
"""
KNOT Database Schema Checker
Compares current database schema with expected Alembic migrations
"""

import asyncio
import asyncpg
import os
import sys
from typing import List, Dict, Any

async def get_db_tables(conn: asyncpg.Connection) -> List[str]:
    """Get list of tables in the database"""
    query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """
    rows = await conn.fetch(query)
    return [row['table_name'] for row in rows]

async def get_db_columns(conn: asyncpg.Connection, table: str) -> List[Dict[str, Any]]:
    """Get columns for a specific table"""
    query = """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
    """
    rows = await conn.fetch(query, table)
    return [dict(row) for row in rows]

async def check_alembic_version(conn: asyncpg.Connection) -> str:
    """Check current Alembic version"""
    try:
        query = "SELECT version_num FROM alembic_version"
        row = await conn.fetchrow(query)
        return row['version_num'] if row else "No version found"
    except:
        return "Alembic version table not found"

async def main():
    # Database connection
    db_url = os.getenv('DATABASE_URL', 'postgresql://knot:password@localhost:5432/knot_db')
    # Convert asyncpg format
    db_url = db_url.replace('postgresql+asyncpg://', 'postgresql://')
    
    print("🔍 KNOT Database Schema Checker")
    print("=" * 40)
    
    try:
        conn = await asyncpg.connect(db_url)
        print("✅ Connected to database")
        
        # Check Alembic version
        version = await check_alembic_version(conn)
        print(f"📋 Alembic version: {version}")
        
        # Get tables
        tables = await get_db_tables(conn)
        print(f"📊 Found {len(tables)} tables:")
        
        expected_tables = [
            'users', 'reports', 'report_images', 'alerts', 
            'disaster_zones', 'support_offers', 'resources',
            'notifications', 'activity_logs', 'alembic_version'
        ]
        
        for table in expected_tables:
            if table in tables:
                print(f"  ✅ {table}")
            else:
                print(f"  ❌ {table} (MISSING)")
        
        # Check for unexpected tables
        unexpected = set(tables) - set(expected_tables)
        if unexpected:
            print(f"⚠️  Unexpected tables: {', '.join(unexpected)}")
        
        # Check key table structure
        if 'users' in tables:
            print("\n👤 Users table structure:")
            columns = await get_db_columns(conn, 'users')
            expected_user_columns = [
                'id', 'full_name', 'email', 'phone', 'password_hash',
                'role', 'status', 'avatar_url', 'organization_name',
                'province', 'district', 'last_login_at', 'created_at',
                'updated_at', 'deleted_at', 'email_verified', 'lat', 'lng'
            ]
            
            found_columns = [col['column_name'] for col in columns]
            for col in expected_user_columns:
                if col in found_columns:
                    print(f"  ✅ {col}")
                else:
                    print(f"  ❌ {col} (MISSING)")
        
        await conn.close()
        print("\n🎉 Schema check completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())