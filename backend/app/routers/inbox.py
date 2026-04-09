from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import httpx, json

from app.database import get_db
from app.models import CachedEmail, AIReply, UserPreference
from app.services.ai_service import generate_replies, _call_groq, _parse_json
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/inbox", tags=["Inbox"])

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"


def get_day_bucket(received_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    delta = (now.date() - received_at.date()).days

    if delta == 0:
        return "today"
    elif delta == 1:
        return "yesterday"
    elif delta <= 7:
        return "last_7_days"
    return "older"


# ✅ FIXED: Pagination + date filter
async def fetch_gmail_messages(google_token: str, max_results: int = 100) -> list[dict]:
    """
    Fetch emails using pagination (more than 10 emails).
    """
    import asyncio
    headers = {"Authorization": f"Bearer {google_token}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        message_ids = []
        next_page_token = None

        # ✅ Pagination loop
        while len(message_ids) < max_results:
            resp = await client.get(
                f"{GMAIL_API}/messages",
                headers=headers,
                params={
                    "maxResults": 50,
                    "labelIds": "INBOX",
                    "pageToken": next_page_token,
                },
            )

            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")

            data = resp.json()
            message_ids.extend([m["id"] for m in data.get("messages", [])])

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

        message_ids = message_ids[:max_results]

        # ✅ Fetch details concurrently
        async def fetch_detail(msg_id):
            detail = await client.get(
                f"{GMAIL_API}/messages/{msg_id}",
                headers=headers,
                params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
            )
            return msg_id, detail

        results = await asyncio.gather(*[fetch_detail(mid) for mid in message_ids])

        emails = []
        from email.utils import parsedate_to_datetime

        for msg_id, detail in results:
            if detail.status_code != 200:
                continue

            msg = detail.json()
            headers_list = msg.get("payload", {}).get("headers", [])
            headers_map = {h["name"]: h["value"] for h in headers_list}

            try:
                received_at = parsedate_to_datetime(headers_map.get("Date", "")).astimezone(timezone.utc)
            except:
                received_at = datetime.now(timezone.utc)

            emails.append({
                "gmail_id": msg_id,
                "subject": headers_map.get("Subject", "(No subject)"),
                "sender": headers_map.get("From", "Unknown"),
                "snippet": msg.get("snippet", ""),
                "body": msg.get("snippet", ""),
                "received_at": received_at,
            })

    return emails


@router.post("/fetch")
async def fetch_and_cache_inbox(
    google_token: str = Header(..., alias="X-Google-Token"),
    force: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user.id
    # DEBUG: trace which user is fetching so we can catch cross-account issues
    print(f"[inbox/fetch] user_id={user_id} email={current_user.email} token_prefix={google_token[:16]}...")

    emails = await fetch_gmail_messages(google_token)
    print(f"[inbox/fetch] Gmail returned {len(emails)} emails for user_id={user_id}")

    inserted = 0
    skipped  = 0

    for email_data in emails:
        # CRITICAL: Check per (user_id, gmail_id) — NOT just gmail_id globally
        existing = await db.execute(
            select(CachedEmail).where(
                CachedEmail.gmail_id == email_data["gmail_id"],
                CachedEmail.user_id  == user_id,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        cached = CachedEmail(
            user_id=user_id,
            gmail_id=email_data["gmail_id"],
            subject=email_data["subject"],
            sender=email_data["sender"],
            snippet=email_data["snippet"],
            body=email_data["body"],
            received_at=email_data["received_at"],
            day_bucket=get_day_bucket(email_data["received_at"]),
        )
        db.add(cached)

        try:
            await db.commit()
            inserted += 1
        except Exception as exc:
            print(f"[inbox/fetch] Insert failed for gmail_id={email_data['gmail_id']}: {exc}")
            await db.rollback()

    print(f"[inbox/fetch] Done: inserted={inserted} skipped={skipped} for user_id={user_id}")
    return {"message": f"Fetched {inserted} emails", "inserted": inserted, "skipped": skipped}


@router.get("/grouped")
async def get_grouped_inbox(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user.id
    result = await db.execute(
        select(CachedEmail)
        .where(CachedEmail.user_id == user_id)
        .order_by(CachedEmail.received_at.desc())
        .limit(1000)
    )

    emails = result.scalars().all()

    grouped = {"today": [], "yesterday": [], "last_7_days": [], "older": []}

    for e in emails:
        bucket = get_day_bucket(e.received_at)

        grouped[bucket].append({
            "id": e.id,
            "gmail_id": e.gmail_id,
            "subject": e.subject,
            "sender": e.sender,
            "snippet": e.snippet,
            "received_at": e.received_at.isoformat(),
            "is_read": e.is_read,
            "day_bucket": bucket,
        })

    return grouped


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


@router.post("/send")
async def send_email(
    request: SendEmailRequest,
    google_token: str = Header(..., alias="X-Google-Token"),
    current_user=Depends(get_current_user),
):
    """
    Send an email via the Gmail API using the user's Google OAuth token.
    Expects X-Google-Token header and JSON body: { to, subject, body }.
    """
    import base64
    from email.mime.text import MIMEText

    # Build the raw RFC 2822 message
    message = MIMEText(request.body)
    message["to"] = request.to
    message["subject"] = request.subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {google_token}"},
            json={"raw": raw},
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Gmail send failed: {resp.text}",
        )

    return {"message": "Email sent successfully", "gmail_response": resp.json()}