from sqlalchemy import Column, Integer, String, Double, DateTime, Text, Date
from sqlalchemy.sql import func
from app.database import Base

class BookingHistory(Base):
    __tablename__ = "booking_history"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(String(100), nullable=False, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    hotel_id = Column(String(100), nullable=False)
    price = Column(Double, nullable=False)
    discount_percent = Column(Double, default=0.0)
    promo_code = Column(String(50), nullable=True)
    event_type = Column(String(50), nullable=False)  # BookingCreated, BookingCancelled, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserStats(Base):
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False, unique=True, index=True)
    total_bookings = Column(Integer, default=0)
    total_spent = Column(Double, default=0.0)
    avg_booking_value = Column(Double, default=0.0)
    last_booking_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class HotelStats(Base):
    __tablename__ = "hotel_stats"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String(100), nullable=False, unique=True, index=True)
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(Double, default=0.0)
    avg_booking_value = Column(Double, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class DailyStats(Base):
    __tablename__ = "daily_stats"

    id = Column(Integer, primary_key=True, index=True)
    stat_date = Column(Date, nullable=False, unique=True, index=True)
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(Double, default=0.0)
    avg_booking_value = Column(Double, default=0.0)
    unique_users = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())