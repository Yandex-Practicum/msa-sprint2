from datetime import datetime

from sqlalchemy import DateTime, Double, String, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Booking(Base):
    __tablename__ = "booking"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    hotel_id: Mapped[str] = mapped_column(String, nullable=False)
    promo_code: Mapped[str | None] = mapped_column(String, nullable=True)
    discount_percent: Mapped[float] = mapped_column(Double, default=0.0)
    price: Mapped[float] = mapped_column(Double, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
