from typing import List

from sqlalchemy import select, insert
from sqlalchemy.orm import load_only
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from settings.db_settings.session import async_session

from files.models import Booking
from files.schemas import CreateBookingSchema, BookingSchema


class BookingRepository:
    def __init__(self, async_session: async_sessionmaker[AsyncSession]):
        self.async_session = async_session

    async def list_bookings(self) -> List[BookingSchema]:
        async with self.async_session() as session:
            query = select(Booking).options(
                load_only(
                    Booking.id,
                    Booking.user_id,
                    Booking.hotel_id,
                    Booking.promo_code,
                    Booking.discount_percent,
                    Booking.price,
                    Booking.created_at,
                    raiseload=True,
                )
            )
            query_result = await session.execute(statement=query)

            rows = query_result.scalars().all()

            bookings_list_dto = [
                BookingSchema(
                    id=_row.id,
                    user_id=_row.user_id,
                    hotel_id=_row.hotel_id,
                    promo_code=_row.promo_code,
                    discount_percent=_row.discount_percent,
                    price=_row.price,
                    created_at=_row.created_at,
                )
                for _row in rows
            ]

            return bookings_list_dto

    async def list_bookings_by_user_id(
        self, user_id: str | None = None
    ) -> List[BookingSchema]:
        async with self.async_session() as session:
            query = (
                select(Booking)
                .options(
                    load_only(
                        Booking.id,
                        Booking.user_id,
                        Booking.hotel_id,
                        Booking.promo_code,
                        Booking.discount_percent,
                        Booking.price,
                        Booking.created_at,
                        raiseload=True,
                    )
                )
                .where(Booking.user_id == user_id)
            )
            query_result = await session.execute(statement=query)

            rows = query_result.scalars().all()

            bookings_list_dto = [
                BookingSchema(
                    id=_row.id,
                    user_id=_row.user_id,
                    hotel_id=_row.hotel_id,
                    promo_code=_row.promo_code,
                    discount_percent=_row.discount_percent,
                    price=_row.price,
                    created_at=_row.created_at,
                )
                for _row in rows
            ]

            return bookings_list_dto

    async def create_booking(self, data: CreateBookingSchema) -> BookingSchema:
        async with self.async_session() as session:
            statement = (
                insert(Booking)
                .values(**data.model_dump())
                .returning(
                    Booking.id,
                    Booking.user_id,
                    Booking.hotel_id,
                    Booking.promo_code,
                    Booking.discount_percent,
                    Booking.price,
                    Booking.created_at,
                )
            )

            stmt_result = await session.execute(statement=statement)

            booking: Booking = stmt_result.one()

            booking_dto = BookingSchema(
                id=booking.id,
                user_id=booking.user_id,
                hotel_id=booking.hotel_id,
                promo_code=booking.promo_code,
                discount_percent=booking.discount_percent,
                price=booking.price,
                created_at=booking.created_at,
            )

            await session.commit()

            return booking_dto


booking_repository = BookingRepository(async_session=async_session)
