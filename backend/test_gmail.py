import asyncio
from app.database import engine
from sqlalchemy import text
from app.routers.inbox import fetch_gmail_messages

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT google_token FROM users WHERE google_token IS NOT NULL LIMIT 1"))
        token = res.scalar()
    
    if not token:
        print("No google token.")
        return
        
    print("Fetching gmail messages directly...")
    try:
        msgs = await fetch_gmail_messages(token, max_results=100)
        print(f"Fetched {len(msgs)} messages from API!")
    except Exception as e:
        print("Error fetching:", type(e), e)

asyncio.run(main())
