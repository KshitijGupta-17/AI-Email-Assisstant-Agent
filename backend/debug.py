import asyncio
from passlib.context import CryptContext
from app.database import engine
from sqlalchemy import text

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, email, hashed_password, google_token FROM users"))
        for r in res.fetchall():
            print(f"ID: {r[0]}, Email: {r[1]}, Pass: {r[2][:15]}..., GoogleToken: {'YES' if r[3] else 'NO'}")

if __name__ == "__main__":
    asyncio.run(main())
