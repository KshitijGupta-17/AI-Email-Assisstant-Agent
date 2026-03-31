from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Email, Reply, UserPreference
from app.schemas import AnalyticsSummary

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """
    Returns aggregated statistics from MySQL:
    - Total emails processed
    - Count of emails per category
    - Count of liked replies per tone
    - Current preferred tone
    """
    # Total email count
    total_result = await db.execute(select(func.count(Email.id)))
    total_emails = total_result.scalar_one()

    # Emails grouped by category
    cat_result = await db.execute(
        select(Email.category, func.count(Email.id))
        .where(Email.category.isnot(None))
        .group_by(Email.category)
    )
    categories = {row[0]: row[1] for row in cat_result.all()}

    # Liked replies grouped by tone
    tone_result = await db.execute(
        select(Reply.tone, func.count(Reply.id))
        .where(Reply.feedback == "liked")
        .group_by(Reply.tone)
    )
    tone_likes = {row[0]: row[1] for row in tone_result.all()}

    # Current user preference
    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == 1)
    )
    preference     = pref_result.scalar_one_or_none()
    preferred_tone = preference.preferred_tone if preference else None

    return AnalyticsSummary(
        total_emails   = total_emails,
        categories     = categories,
        tone_likes     = tone_likes,
        preferred_tone = preferred_tone,
    )