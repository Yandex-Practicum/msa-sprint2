from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped

from data.settings.db_settings.base import Base


class Hotel(Base):
    __tablename__ = "hotels"

    id: Mapped[str] = mapped_column(primary_key=True)

    operational: Mapped[bool]
    fullyBooked: Mapped[bool]

    city: Mapped[str]
    rating: Mapped[float]

    description: Mapped[str] = mapped_column(String(1000))
