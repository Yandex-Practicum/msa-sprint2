from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    String,
    func,
    Double,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Booking(Base):
    __tablename__ = "booking"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        index=True,
        nullable=False,
        server_default=func.now(),
    )

    hotel_id: Mapped[String] = mapped_column(
        String,
        nullable=False,
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        autoincrement=True,
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
    "Booking",
]