from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Double, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class BookingHistory(Base):
    __tablename__ = "booking_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    booking_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    hotel_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    promo_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    discount_pct: Mapped[float] = mapped_column(Double, default=0.0)
    price: Mapped[float] = mapped_column(Double, nullable=False)
    created_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
