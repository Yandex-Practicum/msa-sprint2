from typing import Annotated, List

from fastapi import Depends
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

import source.database.models as db
from source.database.session import get_session
from source.dto.internal import CreateBookingHistoryRecordDto
from .base_repository import BaseRepository


class BookingHistoryRepository(BaseRepository):
    async def create(
        self,
        create_booking_history_record_dto: CreateBookingHistoryRecordDto,
    ) -> db.BookingHistoryRecord:
        returning = (
            db.BookingHistoryRecord.booking_id,
            db.BookingHistoryRecord.created_at,
            db.BookingHistoryRecord.booked_at,
            db.BookingHistoryRecord.hotel_id,
            db.BookingHistoryRecord.promo_code,
            db.BookingHistoryRecord.id,
            db.BookingHistoryRecord.user_id,
            db.BookingHistoryRecord.price,
            db.BookingHistoryRecord.discount_percent,
        )
        query = (
            insert(db.BookingHistoryRecord)
            .values(
                booked_at=create_booking_history_record_dto.booked_at,
                booking_id=create_booking_history_record_dto.booking_id,
                discount_percent=create_booking_history_record_dto.discount_percent,
                hotel_id=create_booking_history_record_dto.hotel_id,
                price=create_booking_history_record_dto.price,
                promo_code=create_booking_history_record_dto.promo_code,
                user_id=create_booking_history_record_dto.user_id,
            )
            .returning(*returning)
        )

        async with self.get_transaction():
            result = await self._db_session.execute(query)

        return result.first()

    async def fetch_for_hotel(self, hotel_id: str) -> List[db.BookingHistoryRecord]:
        query = (
            select(db.BookingHistoryRecord)
            .where(db.BookingHistoryRecord.hotel_id == hotel_id)
        )
        results = await self._db_session.execute(query)

        return [cur_rsv[0] for cur_rsv in results]

    async def fetch_for_user(self, user_id: str) -> List[db.BookingHistoryRecord]:
        query = (
            select(db.BookingHistoryRecord)
            .where(db.BookingHistoryRecord.user_id == user_id)
            .order_by(db.BookingHistoryRecord.created_at)
        )
        results = await self._db_session.execute(query)

        return [cur_rsv[0] for cur_rsv in results]


def get_booking_history_repository(
    db_async_session: Annotated[AsyncSession, Depends(get_session)],
) -> BookingHistoryRepository:
    return BookingHistoryRepository(db_session=db_async_session)


__all__ = [
    "BookingHistoryRepository",
    "get_booking_history_repository",
]
