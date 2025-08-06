from datetime import datetime, UTC
from typing import Optional

from sqlalchemy import Integer, String, Float, DateTime, text
from sqlalchemy.orm import mapped_column
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Booking(Base):
    __tablename__ = "bookings"

    id: int = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: str = mapped_column(String(255), nullable=False)
    hotel_id: str = mapped_column(String(255), nullable=False)

    promo_code: Optional[str] = mapped_column(
        String(100), default=None, server_default=None, nullable=True
    )

    discount_percent: Optional[float] = mapped_column(
        Float(precision=2), default=None, server_default=None, nullable=True
    )

    price: float = mapped_column(Float(precision=2), nullable=False)

    created_at: datetime = mapped_column(
        DateTime(timezone=True),
        default=datetime.now(UTC),
        server_default=text("TIMEZONE('utc', now())"),
        nullable=False,
    )
