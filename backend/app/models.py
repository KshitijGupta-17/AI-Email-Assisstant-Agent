from datetime import datetime
from sqlalchemy import Integer, String, Float, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Email(Base):
    """
    Stores every email submitted by the user.
    Holds the AI results: category, confidence score, and summary.
    """
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
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

    # One email has three reply drafts (formal, friendly, brief)
    replies: Mapped[list["Reply"]] = relationship(
        "Reply",
        back_populates="email",
        cascade="all, delete-orphan",
    )


class Reply(Base):
    """
    Stores the three AI-generated reply drafts for each email.
    Records user feedback (liked / disliked) per draft.
    """
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
        String(50), nullable=False  # formal / friendly / brief
    )
    draft_text: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    feedback: Mapped[str | None] = mapped_column(
        String(20), nullable=True  # liked / disliked / None
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


class UserPreference(Base):
    """
    Tracks which reply tones the user likes.
    One row per user (user_id = 1 for MVP).
    preferred_tone is updated after every liked feedback.
    """
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, unique=True, nullable=False, default=1
    )
    preferred_tone: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    formal_likes: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    friendly_likes: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    brief_likes: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )