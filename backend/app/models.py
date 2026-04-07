from datetime import datetime
from sqlalchemy import Integer, String, Float, Text, DateTime, Boolean, ForeignKey, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from sqlalchemy.sql import func


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    subject: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    sender: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    body: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    category: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    confidence: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    summary: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    replies: Mapped[list["Reply"]] = relationship(
        "Reply",
        back_populates="email",
        cascade="all, delete-orphan",
    )


class Reply(Base):
    __tablename__ = "replies"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    email_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("emails.id", ondelete="CASCADE"),
        nullable=False,
    )
    tone: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    draft_text: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    feedback: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    was_copied: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    email: Mapped["Email"] = relationship(
        "Email", back_populates="replies"
    )



class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(255), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    google_token    = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=func.now())

# New models for advanced inbox & AI features
class CachedEmail(Base):
    """
    Stores Gmail emails fetched at login.
    Avoids re-fetching from Gmail API on every page load.
    day_bucket: 'today' | 'yesterday' | 'last_7_days'
    """
    __tablename__ = "cached_emails"

    id          : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id     : Mapped[int]      = mapped_column(Integer, nullable=False, index=True)
    gmail_id    : Mapped[str]      = mapped_column(String(255), unique=True, nullable=False)
    subject     : Mapped[str|None] = mapped_column(String(500), nullable=True)
    sender      : Mapped[str|None] = mapped_column(String(255), nullable=True)
    snippet     : Mapped[str|None] = mapped_column(Text, nullable=True)
    body        : Mapped[str|None] = mapped_column(Text, nullable=True)
    received_at : Mapped[datetime] = mapped_column(DateTime, nullable=False)
    day_bucket  : Mapped[str]      = mapped_column(String(20), nullable=False)  # today/yesterday/last_7_days
    is_read     : Mapped[bool]     = mapped_column(Boolean, default=False)
    fetched_at  : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    ai_replies  : Mapped[list["AIReply"]] = relationship("AIReply", back_populates="email", cascade="all, delete-orphan")


class AIReply(Base):
    """
    Stores AI-generated replies per email.
    Tracks the full feedback + regeneration history.
    """
    __tablename__ = "ai_replies"

    id           : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    email_id     : Mapped[int]      = mapped_column(Integer, ForeignKey("cached_emails.id", ondelete="CASCADE"), nullable=False)
    user_id      : Mapped[int]      = mapped_column(Integer, nullable=False)
    draft_text   : Mapped[str]      = mapped_column(Text, nullable=False)
    tone         : Mapped[str|None] = mapped_column(String(50), nullable=True)
    version      : Mapped[int]      = mapped_column(Integer, default=1)   # increments on each regeneration
    is_current   : Mapped[bool]     = mapped_column(Boolean, default=True) # only latest version is True
    feedback     : Mapped[str|None] = mapped_column(String(20), nullable=True)  # good/bad/modified
    instruction  : Mapped[str|None] = mapped_column(Text, nullable=True)  # custom feedback text
    created_at   : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    email        : Mapped["CachedEmail"] = relationship("CachedEmail", back_populates="ai_replies")


class UserPreference(Base):
    """
    Stores user preferences including tone history and when they last fetched their inbox.
    """
    __tablename__ = "user_preferences"

    id               : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id          : Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    preferred_tone   : Mapped[str|None] = mapped_column(String(50), nullable=True)
    formal_likes     : Mapped[int]      = mapped_column(Integer, default=0)
    friendly_likes   : Mapped[int]      = mapped_column(Integer, default=0)
    brief_likes      : Mapped[int]      = mapped_column(Integer, default=0)
    tone_history     : Mapped[str|None] = mapped_column(Text, nullable=True)   # JSON string
    last_inbox_fetch : Mapped[datetime|None] = mapped_column(DateTime, nullable=True)