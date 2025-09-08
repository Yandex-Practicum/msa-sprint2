import asyncio
import logging
from typing import Annotated

from fastapi import Depends


from source.clients import KafkaRelay, get_kafka_relay
from source.dto import CreateBookingHistoryRecordDto, ExistingBookingHistoryRecordDto
from source.services.booking_history_service import BookingHistoryService, get_booking_history_service
from source.settings import get_settings
from source.types import NewBookingMessage

logger = logging.getLogger(__name__)
settings = get_settings()


class BookingEventWriter:
    def __init__(
        self,
        booking_history_service: BookingHistoryService,
        kafka_relay: KafkaRelay,
    ):
        self._booking_history_service = booking_history_service
        self._kafka_relay = kafka_relay

    async def _replicate(self):
        try:
            while True:
                msg: NewBookingMessage = await self._kafka_relay.consume_msg()

                if msg.topic != settings.KAFKA_NEW_BOOKING_TOPIC_NAME:
                    pass
                logger.info(f"Got an event regarding new booking: {msg.value}")
                create_booking_history_record_dto = CreateBookingHistoryRecordDto(
                    booked_at=msg.value["created_at"],
                    booking_id=msg.value["id"],
                    discount_percent=msg.value["discount_percent"],
                    hotel_id=msg.value["hotel_id"],
                    price=msg.value["price"],
                    promo_code=msg.value["promo_code"],
                    user_id=msg.value["user_id"],
                )
                new_history_record: ExistingBookingHistoryRecordDto = await self._booking_history_service.create_record(
                    create_booking_history_record_dto=create_booking_history_record_dto,
                )
                logger.info(f"Successfully stored a new booking event: {msg.value}. Result: {new_history_record.model_dump()}")
        except asyncio.CancelledError as cancel_err:
            logger.warning(f"Messages replication has been cancelled {cancel_err}")
        except Exception as err:
            logger.exception(f"An error happened while listening and write messages regarding new booking: {err}")

    async def replicate(self):
        await self._kafka_relay.activate()
        logger.info("Activated a kafka relay, and ready for messages listening")

        await self._replicate()

        logger.info("Trying to stop the kafka relay")
        await self._kafka_relay.deactivate()
        logger.info("Stopped the kafka relay, no longer listening for messages")

def get_booking_event_writer(
    kafka_relay: Annotated[KafkaRelay, Depends(get_kafka_relay)],
    booking_history_service: Annotated[BookingHistoryService, Depends(get_booking_history_service)],
):
    return BookingEventWriter(
        booking_history_service=booking_history_service,
        kafka_relay=kafka_relay,
    )

__all__ = [
    "get_booking_event_writer",
    "BookingEventWriter",
]