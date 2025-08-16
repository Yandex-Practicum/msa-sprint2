from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Integer, String, Float, DateTime, text
from sqlalchemy.orm import mapped_column, Mapped

from data.settings.db_settings.base import Base


class Hotel(Base):
    __tablename__ = "hotels"

    id: Mapped[str] = mapped_column(Integer, primary_key=True)

    operational: Mapped[bool]
    fullyBooked: Mapped[bool]

    city: Mapped[str]
    rating: Mapped[float]

    description: Mapped[str] = mapped_column(String(1000))
