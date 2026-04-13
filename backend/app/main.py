from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import email, analytics, inbox
from app.routers.auth import router as auth_router
from app import models


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once on server startup.
    Creates all MySQL tables if they do not already exist.
    """
    await init_db()
    yield


app = FastAPI(
    title="AI Email Assistant",
    description="Classify, summarize, and generate replies for emails using AI.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(email.router)
app.include_router(analytics.router)
app.include_router(auth_router)
app.include_router(inbox.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "AI Email Assistant API is running."}
