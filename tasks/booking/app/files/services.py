from typing import List


from tasks.booking.app.files.repository import (
    BookingRepository,
    booking_repository,
)

from tasks.booking.app.files.schemas import CreateBookingSchema, BookingSchema


class BookingServices:
    def __init__(
        self,
        repository: BookingRepository,
        promo_code_connector=None,
        review_connector=None,
        user_connector=None,
        hotel_connector=None,
    ):
        self.repository = repository
        self.promo_code_connector = promo_code_connector
        self.review_connector = review_connector
        self.user_connector = user_connector
        self.hotel_connector = hotel_connector

    async def list_bookings(self, user_id: str | None = None) -> List[BookingSchema]:
        if user_id is not None:
            booking_list_dto = await self.repository.list_bookings_by_user_id(
                user_id=user_id
            )
        else:
            booking_list_dto = await self.repository.list_bookings()

        return booking_list_dto

    async def create_booking(
        self, user_id: str, hotel_id: str, promo_code: str
    ) -> BookingSchema:
        self._validate_user(user_id)
        self._validate_hotel(hotel_id)

        base_price = self._resolve_base_price(user_id=user_id)
        discount = self._resolve_promo_discount(promo_code=promo_code, user_id=user_id)
        finalPrice = base_price - discount

        create_booking_dto = CreateBookingSchema(
            user_id=user_id,
            hotel_id=hotel_id,
            promo_code=promo_code,
            discount_percent=discount,
            price=finalPrice,
        )

        booking_dto = self.repository.create_booking(data=create_booking_dto)

        return booking_dto

    def _validate_user(user_id: str):
        return True

    def _validate_hotel(hotel_id: str):
        return True

    def _resolve_base_price(user_id):
        return 100.00

    def _resolve_promo_discount(promo_code: str, user_id: str):
        return 0.0


booking_services = BookingServices(repository=booking_repository)
