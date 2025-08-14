from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from settings.db_settings.session import async_session

from files.models import BookingHistoryRecord
from files.schemas import BookingHistoryRecordSchema


class BookingHistoryRecordRepository:
    def __init__(self, async_session: async_sessionmaker[AsyncSession]):
        self.async_session = async_session

    async def create_booking_history_record(
        self, data: BookingHistoryRecordSchema
    ) -> None:
        async with self.async_session() as session:
            statement = insert(BookingHistoryRecord).values(**data.model_dump())

            await session.execute(statement=statement)

            await session.commit()


booking_history_record_repository = BookingHistoryRecordRepository(async_session=async_session)
