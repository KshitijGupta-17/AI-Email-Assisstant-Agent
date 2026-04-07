import asyncio
from app.database import engine
from sqlalchemy import text
from app.routers.inbox import fetch_gmail_messages, get_day_bucket
from app.models import CachedEmail

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, google_token FROM users WHERE google_token IS NOT NULL LIMIT 1"))
        row = res.fetchone()
        
    if not row:
        print("No user.")
        return
    user_id, token = row
    
    print(f"Fetching from Gmail with max 100...")
    emails = await fetch_gmail_messages(token, 100)
    print(f"Gmail returned {len(emails)} emails!")
    
    async with engine.begin() as conn:
        inserted = 0
        for data in emails:
            res = await conn.execute(text("SELECT id FROM cached_emails WHERE gmail_id = :gid"), {"gid": data["gmail_id"]})
            if not res.scalar():
                await conn.execute(text("""
                    INSERT INTO cached_emails (user_id, gmail_id, subject, sender, snippet, body, received_at, day_bucket, is_read)
                    VALUES (:u, :gid, :sub, :sen, :snip, :body, :rec, :bucket, 0)
                """), {
                    "u": user_id, "gid": data["gmail_id"], "sub": data["subject"], "sen": data["sender"],
                    "snip": data["snippet"], "body": data["body"], "rec": data["received_at"], 
                    "bucket": get_day_bucket(data["received_at"])
                })
                inserted += 1
        print(f"Inserted {inserted} new emails into DB!")
    
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT day_bucket, COUNT(*) FROM cached_emails WHERE user_id = :u GROUP BY day_bucket"), {"u": user_id})
        print("Current DB state:")
        for bucket, count in res.fetchall():
            print(f" - {bucket}: {count}")

        res = await conn.execute(text("SELECT COUNT(*) FROM (SELECT id FROM cached_emails WHERE user_id = :u ORDER BY received_at DESC LIMIT 100) AS sub"), {"u": user_id})
        print(f"Limit 100 returns exactly {res.scalar()} rows.")

if __name__ == "__main__":
    asyncio.run(main())
