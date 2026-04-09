from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import  JWTError , jwt
from passlib.context import CryptContext
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import httpx
import base64

from app.database import get_db
from app.models import User
from app.schemas import SignupRequest, LoginRequest, AuthResponse

router = APIRouter(prefix="/api/auth", tags=["Auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM  = "HS256"
EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security    = HTTPBearer()


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if user:
        # Check if this user was created purely via Google OAuth (dummy password)
        if pwd_context.verify("google-oauth-no-password", user.hashed_password):
            # Let them set their manual password now!
            user.name = request.name
            user.hashed_password = pwd_context.hash(request.password)
            await db.commit()
            await db.refresh(user)
            
            token = create_token(user.id, user.email)
            return AuthResponse(
                access_token=token,
                user_id=user.id,
                user_name=user.name,
                user_email=user.email,
                google_token=user.google_token,
            )
        else:
            raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=request.name,
        email=request.email,
        hashed_password=pwd_context.hash(request.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(user.id, user.email)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user.id, user.email)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        google_token=user.google_token,
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "has_gmail": bool(user.google_token)}


@router.post("/link-gmail")
async def link_gmail(
    token: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Links a Google OAuth access_token to the CURRENTLY logged-in user.
    Works for both manual-login and Google-login users.
    The frontend passes { credential: <google_access_token> }.
    """
    access_token = token.get("credential", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="No Google token provided")

    print(f"[link-gmail] user_id={current_user.id} ({current_user.email}) linking Gmail token...")

    # Verify token is valid and get the Gmail address being linked
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                print(f"[link-gmail] Token verification failed: {resp.status_code}")
                raise HTTPException(status_code=401, detail="Invalid Google token. Please try connecting Gmail again.")

            userinfo = resp.json()
            gmail_email = userinfo.get("email", "unknown")
            print(f"[link-gmail] Verified Gmail: {gmail_email} → linking to user_id={current_user.id} ({current_user.email})")

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[link-gmail] Error verifying token: {exc}")
        raise HTTPException(status_code=500, detail="Failed to verify Google token")

    # Save the token to the CURRENT user — not a lookup by Gmail email
    current_user.google_token = access_token
    await db.commit()
    await db.refresh(current_user)

    print(f"[link-gmail] ✅ Gmail ({gmail_email}) linked to user_id={current_user.id}")
    return {
        "message": f"Gmail connected successfully",
        "gmail_email": gmail_email,
        "user_id": current_user.id,
        "linked_to": current_user.email,
    }


@router.post("/google-login", response_model=AuthResponse)
async def google_login(token: dict, db: AsyncSession = Depends(get_db)):
    """
    Verify Google access token, get user info, create user if not exists, return JWT.
    The 'credential' field holds a Google OAuth2 access_token (implicit flow).
    """
    access_token = token.get("credential", "")
    print(f"[google-login] Received access_token (first 20 chars): {access_token[:20]}...")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code != 200:
                print(f"[google-login] userinfo failed: {response.status_code} {response.text}")
                raise HTTPException(status_code=401, detail="Invalid Google token")

            userinfo = response.json()
            email = userinfo["email"]
            name  = userinfo.get("name", email.split("@")[0])

            print(f"[google-login] Authenticated Gmail account: {email} (name={name})")

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[google-login] Unexpected error: {exc}")
        raise HTTPException(status_code=401, detail="Google authentication failed")

    # Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Create user if not exists
    if not user:
        print(f"[google-login] Creating new user for {email}")
        user = User(
            name=name,
            email=email,
            hashed_password=pwd_context.hash("google-oauth-no-password"),
            google_token=access_token,
        )
        db.add(user)
    else:
        print(f"[google-login] Updating existing user id={user.id} for {email}")
        # Always overwrite with the fresh token so stale tokens never survive
        user.google_token = access_token

    await db.commit()
    await db.refresh(user)

    jwt_token = create_token(user.id, user.email)
    print(f"[google-login] JWT issued for user_id={user.id} email={user.email}")
    return AuthResponse(
        access_token=jwt_token,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        google_token=user.google_token,
    )

@router.get("/gmail/messages")
async def get_gmail_messages(
    google_token: str,
    max_results: int = 10,
    current_user: User = Depends(get_current_user),
):
    try:
        async with httpx.AsyncClient() as client:
            list_response = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers={"Authorization": f"Bearer {google_token}"},
                params={"maxResults": max_results, "labelIds": "INBOX"},
            )

            if list_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Gmail access denied. Login with Google again.")

            messages = list_response.json().get("messages", [])
            emails = []

            for msg in messages:
                msg_response = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                    headers={"Authorization": f"Bearer {google_token}"},
                    params={"format": "full"},
                )

                if msg_response.status_code != 200:
                    continue

                msg_data = msg_response.json()
                headers_list = msg_data.get("payload", {}).get("headers", [])

                subject = ""
                sender = ""
                date = ""
                for h in headers_list:
                    if h["name"].lower() == "subject":
                        subject = h["value"]
                    elif h["name"].lower() == "from":
                        sender = h["value"]
                    elif h["name"].lower() == "date":
                        date = h["value"]

                body = _extract_gmail_body(msg_data.get("payload", {}))

                emails.append({
                    "gmail_id": msg["id"],
                    "subject": subject,
                    "sender": sender,
                    "date": date,
                    "snippet": msg_data.get("snippet", ""),
                    "body": body,
                })

            return {"emails": emails}

    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Failed to connect to Gmail API")


def _extract_gmail_body(payload: dict) -> str:
    import base64

    if payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")

    parts = payload.get("parts", [])
    for part in parts:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")

    for part in parts:
        if part.get("parts"):
            result = _extract_gmail_body(part)
            if result:
                return result

    return ""