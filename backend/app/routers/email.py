from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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
from app.services.ai_service import classify_email, summarize_email, generate_replies, detect_thread
from app.services.file_parser import extract_text_from_file
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/email", tags=["Email"])


@router.post("/analyze", response_model=EmailAnalyzeResponse)
async def analyze_email_endpoint(
    request: EmailAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preference = pref_result.scalar_one_or_none()
    preferred_tone = request.preferred_tone or (preference.preferred_tone if preference else None)

    classification = await classify_email(request.subject or "", request.body)
    summary = await summarize_email(request.subject or "", request.body)
    reply_drafts = await generate_replies(request.subject or "", request.body, preferred_tone)

    email = Email(
        user_id=current_user.id,
        subject=request.subject,
        sender=request.sender,
        body=request.body,
        category=classification["category"],
        confidence=classification["confidence"],
        summary=summary,
    )
    db.add(email)
    await db.flush()

    reply_objects = []
    for draft in reply_drafts:
        reply = Reply(
            email_id=email.id,
            tone=draft["tone"],
            draft_text=draft["draft"],
        )
        db.add(reply)
        reply_objects.append(reply)

    await db.commit()
    await db.refresh(email)
    for r in reply_objects:
        await db.refresh(r)

    is_thread = detect_thread(request.body)

    return EmailAnalyzeResponse(
        email_id=email.id,
        category=email.category,
        confidence=email.confidence,
        summary=email.summary,
        is_thread=is_thread,
        replies=[ReplyOut.model_validate(r) for r in reply_objects],
    )


@router.post("/analyze-with-attachment", response_model=EmailAnalyzeResponse)
async def analyze_email_with_attachment(
    body: str = Form(...),
    subject: str = Form(None),
    sender: str = Form(None),
    preferred_tone: str = Form(None),
    attachment: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    attachment_text = ""
    attachment_name = ""
    if attachment and attachment.filename:
        attachment_name = attachment.filename
        file_content = await attachment.read()
        attachment_text = extract_text_from_file(attachment.filename, file_content)

    full_body = body
    if attachment_text:
        full_body = (
            f"{body}\n\n"
            f"--- Attached Document: {attachment_name} ---\n"
            f"{attachment_text[:3000]}"
        )

    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preference = pref_result.scalar_one_or_none()
    pref_tone = preferred_tone or (preference.preferred_tone if preference else None)

    classification = await classify_email(subject or "", full_body)
    summary = await summarize_email(subject or "", full_body)
    reply_drafts = await generate_replies(subject or "", full_body, pref_tone)

    email = Email(
        user_id=current_user.id,
        subject=subject,
        sender=sender,
        body=full_body,
        category=classification["category"],
        confidence=classification["confidence"],
        summary=summary,
    )
    db.add(email)
    await db.flush()

    reply_objects = []
    for draft in reply_drafts:
        reply = Reply(
            email_id=email.id,
            tone=draft["tone"],
            draft_text=draft["draft"],
        )
        db.add(reply)
        reply_objects.append(reply)

    await db.commit()
    await db.refresh(email)
    for r in reply_objects:
        await db.refresh(r)

    is_thread = detect_thread(body)

    return EmailAnalyzeResponse(
        email_id=email.id,
        category=email.category,
        confidence=email.confidence,
        summary=email.summary,
        is_thread=is_thread,
        replies=[ReplyOut.model_validate(r) for r in reply_objects],
    )


@router.get("/history", response_model=list[EmailHistoryItem])
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Email)
        .where(Email.user_id == current_user.id)
        .order_by(Email.created_at.desc())
        .limit(20)
    )
    emails = result.scalars().all()
    return [EmailHistoryItem.model_validate(e) for e in emails]

@router.get("/{email_id}", response_model=EmailAnalyzeResponse)
async def get_email_detail(
    email_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == current_user.id)
    )
    email = result.scalar_one_or_none()

    if not email:
        raise HTTPException(status_code=404, detail="Email not found.")

    replies_result = await db.execute(
        select(Reply).where(Reply.email_id == email_id)
    )
    reply_objects = replies_result.scalars().all()

    is_thread = detect_thread(email.body or "")

    return EmailAnalyzeResponse(
        email_id=email.id,
        category=email.category,
        confidence=email.confidence,
        summary=email.summary,
        is_thread=is_thread,
        replies=[ReplyOut.model_validate(r) for r in reply_objects],
    )
@router.post("/{email_id}/regenerate", response_model=list[ReplyOut])
async def regenerate_replies(
    email_id: int,
    tone: str | None = None,
    instruction: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == current_user.id)
    )
    email = result.scalar_one_or_none()

    if not email:
        raise HTTPException(status_code=404, detail="Email not found.")

    old_replies = await db.execute(select(Reply).where(Reply.email_id == email_id))
    for old in old_replies.scalars().all():
        await db.delete(old)

    # Build body — optionally prepend user instruction so AI picks it up
    body_with_instruction = email.body
    if instruction:
        body_with_instruction = f"User instruction: {instruction}\n\n{email.body}"

    new_drafts = await generate_replies(email.subject or "", body_with_instruction, tone)

    reply_objects = []
    for draft in new_drafts:
        reply = Reply(
            email_id=email.id,
            tone=draft["tone"],
            draft_text=draft["draft"],
        )
        db.add(reply)
        reply_objects.append(reply)

    await db.commit()
    for r in reply_objects:
        await db.refresh(r)

    return [ReplyOut.model_validate(r) for r in reply_objects]


@router.post("/{reply_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    reply_id: int,
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
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

    updated_preference = None
    if request.feedback == "liked":
        pref_result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == current_user.id)
        )
        preference = pref_result.scalar_one_or_none()

        if not preference:
            preference = UserPreference(user_id=current_user.id)
            db.add(preference)

        if reply.tone == "formal":
            preference.formal_likes += 1
        elif reply.tone == "friendly":
            preference.friendly_likes += 1
        elif reply.tone == "brief":
            preference.brief_likes += 1

        counts = {
            "formal": preference.formal_likes,
            "friendly": preference.friendly_likes,
            "brief": preference.brief_likes,
        }
        preference.preferred_tone = max(counts, key=counts.get)
        updated_preference = preference.preferred_tone

    await db.commit()
    return FeedbackResponse(
        message="Feedback recorded.",
        updated_preference=updated_preference,
    )