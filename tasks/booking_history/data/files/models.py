from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Integer, String, Float, DateTime, text
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


class BookingHistoryRecord(Base):
    __tablename__ = "booking_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    hotel_id: Mapped[str] = mapped_column(String(255), nullable=False)

    promo_code: Mapped[Optional[str]] = mapped_column(
        String(100), default=None, server_default=None, nullable=True
    )

    discount_percent: Mapped[Optional[float]] = mapped_column(
        Float(precision=2), default=None, server_default=None, nullable=True
    )

    price: Mapped[float] = mapped_column(Float(precision=2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.now(timezone.utc),
        server_default=text("TIMEZONE('utc', now())"),
        nullable=False,
    )
