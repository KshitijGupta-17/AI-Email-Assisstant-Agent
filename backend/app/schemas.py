from pydantic import BaseModel, Field
from datetime import datetime


# ── Request bodies (frontend → backend) ──────────────────────────────────────

class EmailAnalyzeRequest(BaseModel):
    subject: str | None = Field(None, max_length=500)
    sender:  str | None = Field(None, max_length=255)
    body:    str        = Field(..., min_length=1,
                                description="Email body cannot be empty.")
    preferred_tone: str | None = Field(None, pattern="^(formal|friendly|brief)$")


class FeedbackRequest(BaseModel):
    feedback: str = Field(..., pattern="^(liked|disliked)$")


# ── Response bodies (backend → frontend) ─────────────────────────────────────

class ReplyOut(BaseModel):
    id:         int
    tone:       str
    draft_text: str
    feedback:   str | None

    model_config = {"from_attributes": True}


class EmailAnalyzeResponse(BaseModel):
    email_id:   int
    category:   str
    confidence: float
    summary:    str
    is_thread:  bool
    replies:    list[ReplyOut]


class EmailHistoryItem(BaseModel):
    id:         int
    subject:    str | None
    sender:     str | None
    category:   str | None
    confidence: float | None
    summary:    str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackResponse(BaseModel):
    message:            str
    updated_preference: str | None


class AnalyticsSummary(BaseModel):
    total_emails:   int
    categories:     dict[str, int]
    tone_likes:     dict[str, int]
    preferred_tone: str | None

class SignupRequest(BaseModel):
    name:     str = Field(..., min_length=2, max_length=255)
    email:    str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email:    str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_name:    str
    user_email:   str

class SignupRequest(BaseModel):
    name:     str = Field(..., min_length=2, max_length=255)
    email:    str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email:    str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_name:    str
    user_email:   str