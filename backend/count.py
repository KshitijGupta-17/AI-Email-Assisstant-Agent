import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM cached_emails"))
        print(f"Total cached: {res.scalar()}")
        
        res = await conn.execute(text("SELECT day_bucket, COUNT(*) FROM cached_emails GROUP BY day_bucket"))
        for bucket, count in res.fetchall():
            print(f"{bucket}: {count}")

asyncio.run(main())
