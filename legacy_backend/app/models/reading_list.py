from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, DateTime
from datetime import datetime, timezone
from app.database import Base

class SavedArticle(Base):
    __tablename__ = "saved_articles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pmid: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    authors: Mapped[str | None] = mapped_column(Text, nullable=True)
    journal: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pub_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    doi: Mapped[str | None ] = mapped_column(String(255), nullable=True)
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )