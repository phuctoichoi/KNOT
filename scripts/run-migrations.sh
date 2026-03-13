#!/bin/bash

# KNOT Database Migration Script
# This script runs Alembic migrations in Docker environment

set -e

echo "🔄 KNOT Database Migration"
echo "=========================="

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
python -c "
import time
import asyncpg
import asyncio
import os

async def wait_for_db():
    db_url = os.getenv('DATABASE_URL', 'postgresql://knot:${POSTGRES_PASSWORD}@postgres:5432/knot_db')
    # Convert asyncpg URL format
    db_url = db_url.replace('postgresql+asyncpg://', 'postgresql://')
    
    for i in range(30):
        try:
            conn = await asyncpg.connect(db_url)
            await conn.close()
            print('✅ Database is ready!')
            return
        except Exception as e:
            print(f'⏳ Waiting for database... ({i+1}/30) - {str(e)[:50]}')
            await asyncio.sleep(2)
    
    raise Exception('❌ Database not ready after 60 seconds')

asyncio.run(wait_for_db())
"

# Check current migration status
echo "📋 Current migration status:"
alembic current

# Run migrations
echo "🚀 Running database migrations..."
alembic upgrade head

# Show final status
echo "✅ Migration completed!"
alembic current

echo "🎉 Database is ready for KNOT application!"