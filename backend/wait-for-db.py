#!/usr/bin/env python3
"""
Wait for database to be ready before starting the application
"""
import asyncio
import asyncpg
import os
import sys
import time

async def wait_for_db():
    """Wait for PostgreSQL database to be ready"""
    db_url = os.getenv('DATABASE_URL', 'postgresql://knot:password@postgres:5432/knot_db')
    
    # Extract connection parameters from URL
    # Format: postgresql+asyncpg://user:pass@host:port/db
    if db_url.startswith('postgresql+asyncpg://'):
        db_url = db_url.replace('postgresql+asyncpg://', 'postgresql://')
    
    max_retries = 30
    retry_interval = 2
    
    for attempt in range(max_retries):
        try:
            print(f"Attempting to connect to database... ({attempt + 1}/{max_retries})")
            conn = await asyncpg.connect(db_url)
            await conn.close()
            print("✅ Database is ready!")
            return True
        except Exception as e:
            print(f"❌ Database not ready: {e}")
            if attempt < max_retries - 1:
                print(f"Waiting {retry_interval} seconds before retry...")
                time.sleep(retry_interval)
            else:
                print(f"❌ Database not ready after {max_retries * retry_interval} seconds")
                return False
    
    return False

if __name__ == "__main__":
    success = asyncio.run(wait_for_db())
    if not success:
        sys.exit(1)