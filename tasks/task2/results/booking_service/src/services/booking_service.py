import logging
from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import Depends

import src.database.models as db
from src.clients import (
    HotelsHttpClient,
    KafkaRelay,
    PromoCodeHttpClient,
    ReviewsHttpClient,
    UsersHttpClient,
    get_hotels_http_client,
    get_kafka_relay,
    get_promo_http_client,
    get_reviews_http_client,
    get_users_http_client,
)
from src.database.repositories import BookingRepository, get_booking_repository
from src.dto import (
    CreateBookingData,
    CreateBookingIntentData,
    ExistingBookingData,
    ReadHotelDto,
    ReadPromoCodeDto,
    ReadUserDto,
)
from src.exceptions import InvalidUserException, InvalidHotelException
from src.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class BookingService:
    def __init__(
        self,
        booking_repo: BookingRepository,
        hotels_http_client: HotelsHttpClient,
        kafka_relay: KafkaRelay,
        promo_code_http_client: PromoCodeHttpClient,
        reviews_http_client: ReviewsHttpClient,
        users_http_client: UsersHttpClient,
    ):
        self._booking_repo = booking_repo
        self._hotels_http_client = hotels_http_client
        self._kafka_relay = kafka_relay
        self._promo_code_http_client = promo_code_http_client
        self._reviews_http_client = reviews_http_client
        self._users_http_client = users_http_client

    @staticmethod
    def _ensure_valid_user(user_dto: Optional[ReadUserDto]):
        if not user_dto or not user_dto.active or user_dto.blacklisted:
            raise InvalidUserException(f"User must exist, be active and not being blacklisted")

    async def  _ensure_valid_hotel(self, hotel_id: str):
        hotel_dto: Optional[ReadHotelDto] = await self._hotels_http_client.get_hotel_info(hotel_id)
        is_trusted_hotel: bool = await self._reviews_http_client.is_trusted_hotel(hotel_id)

        if not is_trusted_hotel:
            raise InvalidHotelException(f"Hotel {hotel_id} isn't trusted based on reviews")

        if not hotel_dto or not hotel_dto.operational or hotel_dto.fullyBooked:
            raise InvalidHotelException(f"Hotel must exist, be operational, trusted, and must not be booked")

    async def _compute_discount(self, promo_code: str, user_id: str) -> float:
        promo_code_dto: Optional[ReadPromoCodeDto] = await self._promo_code_http_client.get_valid_promo_code(
            code=promo_code,
            user_id=user_id,
        )

        if not promo_code_dto:
            return 0.0

        return promo_code_dto.discount

    @staticmethod
    def _compute_price(user_dto: ReadUserDto) -> float:
        is_vip_user = user_dto.status.strip().lower() == "vip"

        return 80.0 if is_vip_user else 100

    async def _relay_new_booking_msg(self, new_booking_dto: ExistingBookingData):
        try:
            msg_dict = new_booking_dto.model_dump(by_alias=True)
            # Ensure a datetime is converted into a str, which is json serializable
            msg_dict["created_at"] = str(msg_dict["created_at"])
            kafka_topic = settings.KAFKA_NEW_BOOKING_TOPIC_NAME

            await self._kafka_relay.send_msg(
                key=new_booking_dto.id,
                msg=msg_dict,
                topic=kafka_topic,
            )
            logger.info(f"Successfully sent a msg regarding a new booking: {msg_dict} to topic: {kafka_topic}")
        except Exception as err:
            logger.exception(f"Failed to relay a new booking msg to Kafka: {err}")

    async def create(
        self,
        create_booking_intent_data: CreateBookingIntentData,
    ) -> ExistingBookingData:
        user_dto: Optional[ReadUserDto] = await self._users_http_client.get_user_info(create_booking_intent_data.user_id)

        self._ensure_valid_user(user_dto)
        await self._ensure_valid_hotel(create_booking_intent_data.hotel_id)

        create_booking_data = CreateBookingData(
            discount_percent=await self._compute_discount(
                promo_code=create_booking_intent_data.promo_code,
                user_id=create_booking_intent_data.user_id,
            ),
            hotel_id=create_booking_intent_data.hotel_id,
            price=self._compute_price(user_dto),
            promo_code=create_booking_intent_data.promo_code,
            user_id=create_booking_intent_data.user_id,
        )

        new_booking: db.Booking = await self._booking_repo.create(create_booking_dto=create_booking_data)
        existing_booking_dto = ExistingBookingData(
            created_at=datetime.fromtimestamp(new_booking.created_at.timestamp()),
            hotel_id=str(new_booking.hotel_id),
            id=str(new_booking.id),
            price=new_booking.price + 0,
            discount_percent=new_booking.discount_percent + 0,
            promo_code=new_booking.promo_code if new_booking.promo_code else None,
            user_id=str(new_booking.user_id),
        )
        await self._relay_new_booking_msg(existing_booking_dto)

        return existing_booking_dto

    async def fetch_for_user(self, user_id: str) -> List[ExistingBookingData]:
        user_reservations: List[db.Booking] = await self._booking_repo.fetch_for_user(user_id)

        return [
            ExistingBookingData(
                created_at=datetime.fromtimestamp(cur_rsv.created_at.timestamp()),
                user_id=str(cur_rsv.user_id),
                id=str(cur_rsv.id),
                hotel_id=str(cur_rsv.hotel_id),
                promo_code=str(cur_rsv.hotel_id),
                price=cur_rsv.price + 0,
                discount_percent=cur_rsv.discount_percent + 0,
            )
            for cur_rsv in user_reservations
        ]

def get_booking_service(
    booking_repo: Annotated[BookingRepository, Depends(get_booking_repository)],
    hotels_http_client: Annotated[HotelsHttpClient, Depends(get_hotels_http_client)],
    kafka_relay: Annotated[KafkaRelay, Depends(get_kafka_relay)],
    promo_code_http_client: Annotated[PromoCodeHttpClient, Depends(get_promo_http_client)],
    reviews_http_client: Annotated[ReviewsHttpClient, Depends(get_reviews_http_client)],
    users_http_client: Annotated[UsersHttpClient, Depends(get_users_http_client)],
) -> BookingService:
    return BookingService(
        booking_repo=booking_repo,
        hotels_http_client=hotels_http_client,
        kafka_relay=kafka_relay,
        promo_code_http_client=promo_code_http_client,
        reviews_http_client=reviews_http_client,
        users_http_client=users_http_client,
    )

__all__ = [
    "BookingService",
    "get_booking_service",
]