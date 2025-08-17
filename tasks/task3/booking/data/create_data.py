from logging import basicConfig, INFO, getLogger

from datetime import datetime, timezone

from asyncio import run

from sqlalchemy import insert, delete

from files.models import Booking
from settings.db_settings.session import async_session


basicConfig(level=INFO)
logger = getLogger("BOOKING:create_data.py")


bookings_list = [
    {
        "id": 1,
        "user_id": "test-user-2",
        "hotel_id": "test-hotel-1",
        "promo_code": "TESTCODE1",
        "discount_percent": 10.0,
        "price": 90.0,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": 2,
        "user_id": "test-user-3",
        "hotel_id": "test-hotel-1",
        "promo_code": None,
        "discount_percent": 0.0,
        "price": 80.0,
        "created_at": datetime.now(timezone.utc),
    },
]


async def create_booking_data():
    async with async_session() as session:
        try:
            delete_stmt = delete(Booking)
            await session.execute(delete_stmt)
            await session.commit()

            for booking in bookings_list:
                insert_stmt = insert(Booking).values(booking)
                await session.execute(insert_stmt)

            await session.commit()

            logger.info("Bookings have been created successfully")
        except Exception as e:
            logger.error(f"An error occurred: {e}")
            await session.rollback()


run(create_booking_data())
