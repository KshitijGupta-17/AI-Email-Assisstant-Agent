from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Email, Reply, UserPreference
from app.schemas import (
    EmailAnalyzeRequest,
    EmailAnalyzeResponse,
    EmailHistoryItem,
    FeedbackRequest,
    FeedbackResponse,
    ReplyOut,
)
from app.services.ai_service import classify_email, summarize_email, generate_replies

router = APIRouter(prefix="/api/email", tags=["Email"])


@router.post("/analyze", response_model=EmailAnalyzeResponse)
async def analyze_email(
    request: EmailAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Main endpoint. Takes an email, runs three AI tasks in sequence:
    1. Classify into urgent / action_required / fyi / spam
    2. Generate one-line summary
    3. Generate three reply drafts (formal, friendly, brief)
    Saves everything to MySQL and returns the full result.
    """
    # 1. Get user's preferred tone to pass as a hint to the reply generator
    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == 1)
    )
    preference     = pref_result.scalar_one_or_none()
    preferred_tone = preference.preferred_tone if preference else None

    # 2. Run AI tasks
    classification = await classify_email(request.subject or "", request.body)
    summary        = await summarize_email(request.subject or "", request.body)
    reply_drafts   = await generate_replies(
        request.subject or "", request.body, preferred_tone
    )

    # 3. Save email + AI results to MySQL
    email = Email(
        subject    = request.subject,
        sender     = request.sender,
        body       = request.body,
        category   = classification["category"],
        confidence = classification["confidence"],
        summary    = summary,
    )
    db.add(email)
    await db.flush()  # gets email.id without committing yet

    # 4. Save the three reply drafts
    reply_objects = []
    for draft in reply_drafts:
        reply = Reply(
            email_id   = email.id,
            tone       = draft["tone"],
            draft_text = draft["draft"],
        )
        db.add(reply)
        reply_objects.append(reply)

    await db.commit()
    await db.refresh(email)
    for r in reply_objects:
        await db.refresh(r)

    return EmailAnalyzeResponse(
        email_id   = email.id,
        category   = email.category,
        confidence = email.confidence,
        summary    = email.summary,
        replies    = [ReplyOut.model_validate(r) for r in reply_objects],
    )


@router.get("/history", response_model=list[EmailHistoryItem])
async def get_history(db: AsyncSession = Depends(get_db)):
    """
    Returns the 20 most recently analyzed emails, newest first.
    """
    result = await db.execute(
        select(Email).order_by(Email.created_at.desc()).limit(20)
    )
    emails = result.scalars().all()
    return [EmailHistoryItem.model_validate(e) for e in emails]


@router.post("/{reply_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    reply_id: int,
    request:  FeedbackRequest,
    db:       AsyncSession = Depends(get_db),
):
    """
    Records liked / disliked feedback on a reply draft.
    If liked, recalculates and updates the user's preferred tone.
    """
    # Find the reply
    result = await db.execute(
        select(Reply).where(Reply.id == reply_id)
    )
    reply = result.scalar_one_or_none()

    if not reply:
        raise HTTPException(
            status_code=404,
            detail=f"Reply with id {reply_id} not found."
        )

    reply.feedback = request.feedback
    await db.flush()

    # Update preference only when the user liked a reply
    updated_preference = None
    if request.feedback == "liked":
        pref_result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == 1)
        )
        preference = pref_result.scalar_one_or_none()

        if not preference:
            preference = UserPreference(user_id=1)
            db.add(preference)

        # Increment like counter for this tone
        if reply.tone == "formal":
            preference.formal_likes += 1
        elif reply.tone == "friendly":
            preference.friendly_likes += 1
        elif reply.tone == "brief":
            preference.brief_likes += 1

        # Preferred tone = whichever tone has the most likes
        counts = {
            "formal":   preference.formal_likes,
            "friendly": preference.friendly_likes,
            "brief":    preference.brief_likes,
        }
        preference.preferred_tone = max(counts, key=counts.get)
        updated_preference        = preference.preferred_tone

    await db.commit()
    return FeedbackResponse(
        message            = "Feedback recorded.",
        updated_preference = updated_preference,
    )