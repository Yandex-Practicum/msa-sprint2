from sqlalchemy import Column, BigInteger, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class BookingHistory(Base):
    __tablename__ = 'booking_history'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    hotel_id = Column(String, nullable=False)
    promo_code = Column(String, nullable=True)
    discount_percent = Column(Float, default=0.0)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return (
            f"BookingHistory(id={self.id}, "
            f"user_id='{self.user_id}', "
            f"hotel_id='{self.hotel_id}', "
            f"promo_code='{self.promo_code}', "
            f"discount_percent={self.discount_percent}, "
            f"price={self.price}, "
            f"created_at='{self.created_at}')"
        )
