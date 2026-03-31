from pydantic import BaseModel, Field
from datetime import datetime


# ── Request bodies (frontend → backend) ──────────────────────────────────────

class EmailAnalyzeRequest(BaseModel):
    subject: str | None = Field(None, max_length=500)
    sender:  str | None = Field(None, max_length=255)
    body:    str        = Field(..., min_length=1,
                                description="Email body cannot be empty.")


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