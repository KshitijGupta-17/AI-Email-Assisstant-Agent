import asyncio
from app.database import engine
from sqlalchemy import text
from app.models import CachedEmail
from app.routers.inbox import fetch_gmail_messages, get_day_bucket

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, google_token FROM users WHERE google_token IS NOT NULL LIMIT 1"))
        row = res.fetchone()
        
    if not row:
        print("No user found")
        return
        
    user_id, token = row
    
    print("Fetching gmail messages...")
    emails = await fetch_gmail_messages(token, 100)
    print(f"Got {len(emails)} emails from Gmail.")
    
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.asyncio import AsyncSession
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        inserted = 0
        failed = 0
        for email_data in emails:
            try:
                cached = CachedEmail(
                    user_id     = user_id,
                    gmail_id    = email_data["gmail_id"],
                    subject     = str(email_data["subject"])[:500] if email_data["subject"] else "",
                    sender      = str(email_data["sender"])[:255] if email_data["sender"] else "",
                    snippet     = email_data["snippet"],
                    body        = email_data["body"],
                    received_at = email_data["received_at"],
                    day_bucket  = get_day_bucket(email_data["received_at"]),
                )
                db.add(cached)
                await db.commit()
                inserted += 1
            except Exception as e:
                await db.rollback()
                failed += 1
                if failed == 1:
                    print(f"First error: {e}")
                
        print(f"Inserted: {inserted}, Failed: {failed}")

if __name__ == "__main__":
    asyncio.run(main())
