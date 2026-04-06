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


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False
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


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(255), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at      = Column(DateTime, default=func.now())