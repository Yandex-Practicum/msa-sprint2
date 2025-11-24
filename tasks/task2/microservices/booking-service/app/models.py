from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Booking(Base):
    __tablename__ = 'bookings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    hotel_id = Column(String, nullable=False)
    promo_code = Column(String, nullable=True)
    discount_percent = Column(Float, default=0.0)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"Booking(id={self.id}, user_id={self.user_id}, hotel_id={self.hotel_id}, promo_code={self.promo_code}, discount_percent={self.discount_percent}, price={self.price}, created_at={self.created_at})"
