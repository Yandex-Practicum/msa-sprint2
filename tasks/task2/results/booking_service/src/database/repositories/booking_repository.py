from typing import Annotated, List

from fastapi import Depends
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

import src.database.models as db
from src.database.session import get_session
from src.dto import CreateBookingData
from .base_repository import BaseRepository


class BookingRepository(BaseRepository):
    async def create(
        self,
        create_booking_dto: CreateBookingData,
    ) -> db.Booking:
        returning = (
            db.Booking.created_at,
            db.Booking.hotel_id,
            db.Booking.promo_code,
            db.Booking.id,
            db.Booking.user_id,
            db.Booking.price,
            db.Booking.discount_percent,
        )
        query = (
            insert(db.Booking)
            .values(
                hotel_id=create_booking_dto.hotel_id,
                promo_code=create_booking_dto.promo_code,
                user_id=create_booking_dto.user_id,
                price=create_booking_dto.price,
                discount_percent=create_booking_dto.discount_percent,
            )
            .returning(*returning)
        )

        async with self.get_transaction():
            result = await self._db_session.execute(query)

        return result.first()

    async def fetch_for_user(self, user_id: str) -> List[db.Booking]:
        query = (
            select(db.Booking)
            .where(db.Booking.user_id == user_id)
        )
        results = await self._db_session.execute(query)

        return [cur_rsv[0] for cur_rsv in results]


def get_booking_repository(
    db_async_session: Annotated[AsyncSession, Depends(get_session)],
) -> BookingRepository:
    return BookingRepository(db_session=db_async_session)


__all__ = [
    "BookingRepository",
    "get_booking_repository",
]
