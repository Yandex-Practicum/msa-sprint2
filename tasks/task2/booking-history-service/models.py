from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://history:history@history-db:5432/history")

Base = declarative_base()

class BookingHistory(Base):
    __tablename__ = "booking_history"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    hotel_id = Column(String, nullable=False)
    promo_code = Column(String, nullable=True)
    discount_percent = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False)

# Инициализация
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
