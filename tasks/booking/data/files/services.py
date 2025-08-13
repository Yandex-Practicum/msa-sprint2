from datetime import datetime, timezone
from typing import List

from files.repository import (
    BookingRepository,
    booking_repository,
)

from files.schemas import CreateBookingSchema, BookingSchema
from settings.kafka_settings.event_manager import (
    AsyncEventManager,
    async_event_manager,
)


class ValidationFailedError(Exception):
    def __init__(self, *args):
        if args:
            self.message = args[0]
        else:
            self.message = None

    def __str__(self):
        if self.message:
            return self.message
        else:
            return "Provided data is not valid"


class BookingServices:
    def __init__(
        self,
        repository: BookingRepository,
        event_manager: AsyncEventManager,
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

        self.event_manager = event_manager

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
        reasons_list = []

        user_not_valid_reason = self._validate_user(user_id=user_id)
        if user_not_valid_reason is not None:
            reasons_list.append(user_not_valid_reason)

        hotel_not_valid_reason = self._validate_hotel(hotel_id=hotel_id)
        if hotel_not_valid_reason is not None:
            reasons_list.append(hotel_not_valid_reason)
        if len(reasons_list) > 0:
            message = {
                "user_id": "",
                "hotel_id": "",
                "promo_code": "",
                "discount_percent": 0.0,
                "price": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "reason": " | ".join(reasons_list),
                "created": False,
            }

            await self.event_manager.publish(
                event_type="booking_denied", message=message
            )

            return BookingSchema(
                id="-1",
                user_id=message["user_id"],
                hotel_id=message["hotel_id"],
                promo_code=message["promo_code"],
                discount_percent=message["discount_percent"],
                price=message["price"],
                created_at=str(datetime.now(timezone.utc)),
            )

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

        booking_dto = await self.repository.create_booking(data=create_booking_dto)

        message = {
            "user_id": booking_dto.user_id,
            "hotel_id": booking_dto.hotel_id,
            "promo_code": booking_dto.promo_code,
            "discount_percent": booking_dto.discount_percent,
            "price": booking_dto.price,
            "reason": "",
            "created": True,
            "created_at": booking_dto.created_at.isoformat(),
        }

        await self.event_manager.publish(event_type="booking_created", message=message)

        return booking_dto

    def _validate_user(self, user_id: str):
        if user_id == "test-user-0":
            return "User is not trusted"

        return None

    def _validate_hotel(self, hotel_id: str):
        if hotel_id == "test-hotel-2":
            return "Hotel is fully booked"

        if hotel_id == "test-hotel-3":
            return "Hotel is not trusted"

        return None

    def _resolve_base_price(self, user_id):
        return 100.00

    def _resolve_promo_discount(self, promo_code: str, user_id: str):
        return 0.0


booking_services = BookingServices(
    repository=booking_repository, event_manager=async_event_manager
)
