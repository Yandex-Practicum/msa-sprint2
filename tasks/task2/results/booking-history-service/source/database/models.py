import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    String,
    func,
    Double,
    UUID,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class BookingHistoryRecord(Base):
    """
    💡 The model intentionally doesn't have any composite key for the purpose
    of efficiency.
    An analytical pipeline must take care of deduplication.
    """

    __tablename__ = "booking_history_record"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        index=True,
        nullable=False,
        server_default=func.now(),
    )

    booked_at: Mapped[str] = mapped_column(
        String,
        index=True,
        nullable=False,
    )

    booking_id: Mapped[str] = mapped_column(
        String,
        index=True,
        nullable=False,
    )

    hotel_id: Mapped[String] = mapped_column(
        String,
        nullable=False,
    )

    id: Mapped[UUID] = mapped_column(
        UUID,
        default=uuid.uuid4,
        primary_key=True,
    )

    discount_percent: Mapped[float] = mapped_column(
        Double,
        nullable=False,
    )

    price: Mapped[float] = mapped_column(
        Double,
        nullable=False,
    )

    promo_code: Mapped[Optional[String]] = mapped_column(
        String,
        nullable=True,
    )

    user_id: Mapped[String] = mapped_column(
        String,
        nullable=False,
    )

__all__ = [
    "BookingHistoryRecord",
]