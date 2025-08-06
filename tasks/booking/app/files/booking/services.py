from typing import List

from tasks.booking.app.files.booking.repository import (
    BookingRepository,
    booking_repository,
)

from tasks.booking.app.files.booking.schemas import BookingSchema


class BookingServices:
    def __init__(self, repository: BookingRepository):
        self.repository = repository

    async def list_bookings(self, user_id: str | None = None) -> List[BookingSchema]:
        booking_list_dto = await self.repository.list_bookings(user_id=user_id)

        return booking_list_dto

    async def create_booking():
        pass
