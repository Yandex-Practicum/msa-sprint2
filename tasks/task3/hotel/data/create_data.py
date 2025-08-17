from logging import basicConfig, INFO, getLogger


from asyncio import run

from sqlalchemy import insert, delete

from files.models import Hotel
from settings.db_settings.session import async_session


basicConfig(level=INFO)
logger = getLogger("BOOKING:create_data.py")


hotels_list = [
    {
        "id": "test-hotel-1",
        "operational": True,
        "fullyBooked": False,
        "city": "Seoul",
        "rating": 4.7,
        "description": "Modern hotel in Seoul downtown with spa and skybar.",
    },
    {
        "id": "test-hotel-2",
        "operational": True,
        "fullyBooked": True,
        "city": "Busan",
        "rating": 4.5,
        "description": "Luxury beach resort in Busan with ocean view.",
    },
]


async def create_hotel_data():
    async with async_session() as session:
        try:
            delete_stmt = delete(Hotel)
            await session.execute(delete_stmt)
            await session.commit()

            for hotel in hotels_list:
                insert_stmt = insert(Hotel).values(hotel)

            await session.execute(insert_stmt)
            await session.commit()

            logger.info("Hotels have been created successfully")
        except Exception as e:
            logger.error(f"An error occurred: {e}")
            await session.rollback()


run(create_hotel_data())


# {
#     "id": "test-hotel-3",
#     "operational": False,
#     "fullyBooked": False,
#     "city": "Daegu",
#     "rating": 3.8,
#     "description": "Affordable business hotel in Daegu center.",
# },
