import asyncio
from app.database import engine
from sqlalchemy import text
from app.routers.inbox import get_grouped_inbox

# We'll just call the API
import httpx

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, google_token FROM users WHERE google_token IS NOT NULL LIMIT 1"))
        row = res.fetchone()
    if not row: return
    user_id = row[0]
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://127.0.0.1:8000/api/inbox/grouped", headers={"X-User-Id": str(user_id)})
        data = resp.json()
        print(f"today: len={len(data.get('today', []))}")
        print(f"yesterday: len={len(data.get('yesterday', []))}")
        print(f"last_7_days: len={len(data.get('last_7_days', []))}")
        print(f"older: len={len(data.get('older', []))}")

asyncio.run(main())
