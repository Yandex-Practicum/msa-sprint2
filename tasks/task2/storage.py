import os
from typing import Optional

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from models import Base, Booking

# Подключение к БД booking-service
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://booking:booking@db_booking:5432/booking"
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def save_booking(user_id: str, hotel_id: str, promo_code: str | None, discount: float, price: float):
    async with AsyncSessionLocal() as session:
        booking = Booking(
            user_id=user_id,
            hotel_id=hotel_id,
            promo_code=promo_code,
            discount_percent=discount,
            price=price,
        )
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        return booking

async def list_bookings(user_id: Optional[str] = None) -> list[Booking]:
    async with AsyncSessionLocal() as session:
        print('Достаем все бронирования')
        stmt = select(Booking)
        if user_id:
            print(f'user_id: {user_id}')
            stmt = stmt.where(Booking.user_id == user_id)
        result = await session.execute(stmt)
        return result.scalars().all()
