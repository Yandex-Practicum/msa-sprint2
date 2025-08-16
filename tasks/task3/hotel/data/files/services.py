from logging import getLogger, INFO, basicConfig

from datetime import datetime, timezone
from typing import List

from files.repository import (
    HotelRepository,
    hotel_repository,
)

from files.schemas import HotelSchema
from settings.kafka_settings.event_manager import (
    AsyncEventManager,
    async_event_manager,
)

basicConfig(level=INFO)


logger = getLogger("[BOOKING: SERVICES]")


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


class HotelServices:
    def __init__(
        self,
        repository: HotelRepository,
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

    async def list_hotels(self) -> List[HotelSchema]:
        hotels_list_dto = await self.repository.list_hotels()

        return hotels_list_dto

    async def create_hotel(self, data: HotelSchema) -> HotelSchema:

        hotel_dto = await self.repository.create_hotel(data=data)

        return hotel_dto


hotel_services = HotelServices(
    repository=hotel_repository,
    event_manager=async_event_manager,
)
