import os
import json
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
MODEL        = "llama-3.1-8b-instant"

FALLBACK_REPLIES = [
    {"tone": "formal",   "draft": "Thank you for your email. I will respond shortly."},
    {"tone": "friendly", "draft": "Hey! Got your message. I'll get back to you soon!"},
    {"tone": "brief",    "draft": "Noted. Will respond shortly."},
]


async def _call_groq(system_prompt: str, user_prompt: str) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set in .env")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "temperature": 0.3,
    }

    max_retries = 3
    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(GROQ_URL, headers=headers, json=payload)

                if response.status_code == 429:
                    wait_time = (attempt + 1) * 10
                    print(f"Rate limited. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
                    await asyncio.sleep(wait_time)
                    continue

                if response.status_code != 200:
                    raise RuntimeError(f"Groq API Error {response.status_code}: {response.text}")

                data = response.json()
                return data["choices"][0]["message"]["content"]

            except httpx.RequestError as e:
                raise RuntimeError(f"Network error: {str(e)}")

            except KeyError:
                raise RuntimeError(f"Unexpected response format: {response.text}")

    raise RuntimeError("Groq API rate limit exceeded. Please wait a moment and try again.")


def _parse_json(raw: str) -> dict:
    cleaned = raw.strip()

    if cleaned.startswith("```"):
        lines   = cleaned.splitlines()
        cleaned = "\n".join(lines[1:-1]).strip()

    return json.loads(cleaned)


def detect_thread(body: str) -> bool:
    patterns = [
        "On ", "wrote:", "From:", "Sent:", "------",
        ">>", "Subject:", "Forwarded message",
        "Original Message", "Reply-To:",
    ]
    matches = sum(1 for p in patterns if p in body)
    return matches >= 2


async def classify_email(subject: str, body: str) -> dict:
    system = """You are an expert email classification assistant. You must be HONEST about uncertainty.

Classify the email into exactly one category:

- urgent: IMMEDIATE action needed. Hard deadlines within 24-48hrs, money/legal/production issues, words like "ASAP", "immediately", "critical", "down", "overdue", "deadline today"
- action_required: Needs response or task but NOT time-critical. Approvals, reviews, meeting requests, form submissions, general requests
- fyi: Informational only, ZERO action needed. Newsletters, announcements, status updates, notifications, confirmations, shared documents
- spam: Unsolicited, promotional, suspicious, prize offers, phishing, marketing blasts

CRITICAL CONFIDENCE RULES — most emails should be 0.60-0.85:

0.90-1.00 : ONLY use when category is absolutely unmistakable. Example: "SERVER IS DOWN - FIX IMMEDIATELY" = urgent 0.95
0.75-0.89 : Clear signals but minor ambiguity exists. Example: "Please review the attached report" = action_required 0.80
0.60-0.74 : Moderate signals, reasonable person might disagree. Example: "Meeting notes from today" = fyi 0.65
0.45-0.59 : Genuinely ambiguous, could reasonably be 2 categories. Example: "FYI - invoice attached" = could be fyi or action_required 0.50
0.30-0.44 : Very unclear, weak signals only

COMMON MISTAKES TO AVOID:
- A shared document notification is FYI (0.60-0.70), NOT action_required
- A meeting reminder is action_required (0.70-0.80), NOT urgent
- A newsletter with a deadline mentioned is still FYI (0.55-0.65)
- "Please review" is action_required (0.75-0.85), NOT urgent
- Only use 0.90+ when you are ABSOLUTELY certain — this should happen rarely

Ask yourself: "Would 10 different people all agree on this category?" If not, lower the confidence.

Respond ONLY with valid JSON. No markdown. No explanation outside JSON.
Schema: {"category": "urgent"|"action_required"|"fyi"|"spam", "confidence": <float>, "reason": "<one sentence explaining why this confidence level>"}"""

    user = f"Subject: {subject or 'No subject'}\n\nBody:\n{body}"

    raw = await _call_groq(system, user)

    try:
        result = _parse_json(raw)
        valid = {"urgent", "action_required", "fyi", "spam"}

        if result.get("category") not in valid:
            result["category"] = "fyi"
            result["confidence"] = 0.5

        result["confidence"] = round(
            max(0.0, min(1.0, float(result["confidence"]))), 2
        )

        return result

    except (json.JSONDecodeError, KeyError, TypeError):
        return {
            "category": "fyi",
            "confidence": 0.5,
            "reason": "Could not parse model response.",
        }


async def summarize_email(subject: str, body: str) -> str:
    is_thread = detect_thread(body)

    if is_thread:
        system = (
            "You are an email thread summarization assistant. "
            "This is an email thread with multiple replies. "
            "Respond ONLY with valid JSON. No markdown, no explanation. "
            'Schema: {"summary": "<concise summary covering key points, '
            'decisions, and action items from the thread, max 50 words>"}'
        )
    else:
        system = (
            "You are an email summarization assistant. "
            "Respond ONLY with valid JSON. No markdown, no explanation. "
            'Schema: {"summary": "<one sentence, max 25 words>"}'
        )

    user = f"Subject: {subject or 'No subject'}\n\nBody:\n{body}"

    raw = await _call_groq(system, user)

    try:
        result = _parse_json(raw)
        return result.get("summary", "No summary available.")
    except (json.JSONDecodeError, KeyError, TypeError):
        return "Could not generate summary."


async def generate_replies(
    subject: str,
    body: str,
    preferred_tone: str | None = None,
) -> list[dict]:
    tone_hint = (
        f"The user prefers {preferred_tone} replies — "
        f"make the {preferred_tone} draft especially polished. "
        if preferred_tone else ""
    )

    system = (
        "You are a professional email reply assistant. "
        f"{tone_hint}"
        "Respond ONLY with valid JSON. No markdown, no explanation. "
        'Schema: {"replies": ['
        '{"tone": "formal",   "draft": "<reply>"},'
        '{"tone": "friendly", "draft": "<reply>"},'
        '{"tone": "brief",    "draft": "<reply>"}'
        "]}"
    )

    user = (
        f"Write 3 reply drafts for this email.\n\n"
        f"Subject: {subject or 'No subject'}\n\n"
        f"Body:\n{body}"
    )

    raw = await _call_groq(system, user)

    try:
        result  = _parse_json(raw)
        replies = result.get("replies", [])

        if len(replies) == 3:
            return replies

        return FALLBACK_REPLIES

    except (json.JSONDecodeError, KeyError, TypeError):
        return FALLBACK_REPLIES