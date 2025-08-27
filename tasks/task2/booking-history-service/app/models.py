from sqlalchemy import Column, String, Float, DateTime, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class BookingHistory(Base):
    __tablename__ = 'booking_history'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    hotel_id = Column(String, nullable=False)
    promo_code = Column(String)
    discount_percent = Column(Float, default=0.0)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
