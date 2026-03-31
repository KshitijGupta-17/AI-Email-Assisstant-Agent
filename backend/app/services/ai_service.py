import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
MODEL        = "llama-3.1-8b-instant"


# Fallback replies used when the model returns unparseable output
FALLBACK_REPLIES = [
    {"tone": "formal",   "draft": "Thank you for your email. I will respond shortly."},
    {"tone": "friendly", "draft": "Hey! Got your message. I'll get back to you soon!"},
    {"tone": "brief",    "draft": "Noted. Will respond shortly."},
]


async def _call_groq(system_prompt: str, user_prompt: str) -> str:
    """
    Makes a single async request to the Groq API.
    Returns the raw text content from the model.
    Includes proper debugging for 400 errors.
    """
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
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.post(
                GROQ_URL,
                headers=headers,
                json=payload
            )

            # 🔥 DEBUG OUTPUT (VERY IMPORTANT)
            print("\n====== GROQ DEBUG ======")
            print("STATUS CODE:", response.status_code)
            print("RESPONSE TEXT:", response.text)
            print("========================\n")

            # ❌ If API failed → show real error
            if response.status_code != 200:
                raise RuntimeError(f"Groq API Error: {response.text}")

            data = response.json()

            # ✅ Safe extraction
            return data["choices"][0]["message"]["content"]

        except httpx.RequestError as e:
            raise RuntimeError(f"Network error while calling Groq: {str(e)}")

        except KeyError:
            raise RuntimeError(f"Unexpected Groq response format: {response.text}")


def _parse_json(raw: str) -> dict:
    """
    Parses JSON from the model response.
    Handles the common case where the model wraps output in ```json fences.
    Raises json.JSONDecodeError if the cleaned text is still not valid JSON.
    """
    cleaned = raw.strip()

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(lines[1:-1]).strip()

    return json.loads(cleaned)


async def classify_email(subject: str, body: str) -> dict:
    """
    Classifies an email into: urgent, action_required, fyi, or spam.
    Returns dict with keys: category, confidence, reason.
    Falls back to fyi/0.5 if the model returns invalid output.
    """
    system = (
        "You are an email classification assistant. "
        "Respond ONLY with valid JSON. No markdown, no explanation. "
        "Schema: "
        '{"category": "urgent" | "action_required" | "fyi" | "spam", '
        '"confidence": <float 0.0-1.0>, '
        '"reason": "<one sentence>"}'
    )
    user = f"Subject: {subject or 'No subject'}\n\nBody:\n{body}"

    raw = await _call_groq(system, user)

    try:
        result = _parse_json(raw)
        valid = {"urgent", "action_required", "fyi", "spam"}
        if result.get("category") not in valid:
            result["category"] = "fyi"
            result["confidence"] = 0.5
        return result
    except (json.JSONDecodeError, KeyError, TypeError):
        return {
            "category":   "fyi",
            "confidence": 0.5,
            "reason":     "Could not parse model response.",
        }


async def summarize_email(subject: str, body: str) -> str:
    """
    Returns a single-sentence summary of the email (max 25 words).
    Falls back to a default string if the model returns invalid output.
    """
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
    """
    Generates three reply drafts: formal, friendly, brief.
    All three are generated in a single API call (cost efficient).
    If preferred_tone is set, that tone gets a quality hint in the prompt.
    Falls back to FALLBACK_REPLIES if the model returns invalid output.
    """
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