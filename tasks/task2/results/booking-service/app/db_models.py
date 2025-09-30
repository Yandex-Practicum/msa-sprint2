from sqlalchemy import Column, Integer, String, Double, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class BookingDB(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    hotel_id = Column(String(100), nullable=False)
    promo_code = Column(String(50), nullable=True)
    discount_percent = Column(Double, default=0.0)
    price = Column(Double, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "hotel_id": self.hotel_id,
            "promo_code": self.promo_code,
            "discount_percent": self.discount_percent,
            "price": self.price,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }