from typing import List

from sqlalchemy import select, insert
from sqlalchemy.orm import load_only
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from settings.db_settings.session import async_session

from files.models import Hotel
from files.schemas import HotelSchema


class HotelRepository:
    def __init__(self, async_session: async_sessionmaker[AsyncSession]):
        self.async_session = async_session

    async def list_hotels(self) -> List[HotelSchema]:
        async with self.async_session() as session:
            query = select(Hotel).options(
                load_only(
                    Hotel.id,
                    Hotel.operational,
                    Hotel.fullyBooked,
                    Hotel.city,
                    Hotel.rating,
                    Hotel.description,
                    raiseload=True,
                )
            )
            query_result = await session.execute(statement=query)

            rows = query_result.scalars().all()

            bookings_list_dto = [
                HotelSchema(
                    id=_row.id,
                    operational=_row.operational,
                    fullyBooked=_row.fullyBooked,
                    city=_row.city,
                    rating=_row.rating,
                    description=_row.description,
                )
                for _row in rows
            ]

            return bookings_list_dto

    async def list_hotels_by_ids(self, ids: List[str]) -> List[HotelSchema]:
        async with self.async_session() as session:
            query = (
                select(Hotel)
                .options(
                    load_only(
                        Hotel.id,
                        Hotel.operational,
                        Hotel.fullyBooked,
                        Hotel.city,
                        Hotel.rating,
                        Hotel.description,
                        raiseload=True,
                    )
                )
                .where(Hotel.id.in_(ids))
            )
            query_result = await session.execute(statement=query)

            rows = query_result.scalars().all()

            bookings_list_dto = [
                HotelSchema(
                    id=_row.id,
                    operational=_row.operational,
                    fullyBooked=_row.fullyBooked,
                    city=_row.city,
                    rating=_row.rating,
                    description=_row.description,
                )
                for _row in rows
            ]

            return bookings_list_dto

    async def create_hotel(self, data: HotelSchema) -> HotelSchema:
        async with self.async_session() as session:
            statement = (
                insert(Hotel)
                .values(**data.model_dump())
                .returning(
                    Hotel.id,
                    Hotel.operational,
                    Hotel.fullyBooked,
                    Hotel.city,
                    Hotel.rating,
                    Hotel.description,
                )
            )

            stmt_result = await session.execute(statement=statement)

            hotel: Hotel = stmt_result.one()

            hotel_dto = HotelSchema(
                id=hotel.id,
                operational=hotel.operational,
                fullyBooked=hotel.fullyBooked,
                city=hotel.city,
                rating=hotel.rating,
                description=hotel.description,
            )

            await session.commit()

            return hotel_dto


hotel_repository = HotelRepository(async_session=async_session)
