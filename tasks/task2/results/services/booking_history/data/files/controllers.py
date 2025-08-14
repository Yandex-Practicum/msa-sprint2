import json
import logging
from datetime import datetime
from asyncio import sleep
from typing import Dict, Any
from aiokafka import AIOKafkaConsumer

from settings.settings import settings
from files.services import BookingHistoryRecordServices, booking_history_record_services
from files.schemas import BookingHistoryRecordSchema, CreateBookingHistoryRecordSchema

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("[LOGGING HISTORY:controllers.py]")


class KafkaConsumer:
    def __init__(
        self,
        booking_history_record_services: BookingHistoryRecordServices,
        consumer_class: AIOKafkaConsumer,
        topic: str = "booking-history",
        bootstrap_servers: str = settings.kafka_url,
        group_id: str = "booking-group",
    ):
        self._booking_history_record_services = booking_history_record_services
        self._consumer: AIOKafkaConsumer = None
        self._consumer_class = consumer_class
        self._topic = topic
        self._bootstrap_servers = bootstrap_servers
        self._group_id = group_id

    async def _initialize_kafka_consumber(self) -> None:
        retries = 5
        for _ in range(retries):
            try:
                await self._consumer.start()
                break  # Exit the loop if successful
            except Exception as e:
                logger.error(
                    f"Failed to connect to Kafka: {e}. Retrying in 5 seconds..."
                )
                await sleep(5)  # Wait before retrying
        else:
            logger.critical("Could not connect to Kafka after several attempts.")
            raise RuntimeError("Kafka connection failed")

    async def start(self):
        """Start the Kafka consumer"""
        self._consumer = self._consumer_class(
            self._topic,
            bootstrap_servers=self._bootstrap_servers,
            group_id=self._group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="earliest",  # Start from beginning if no offset
        )
        await self._consumer.start()
        logger.info(f"Consumer started for topic: {await self._consumer.topics()}")

    async def stop(self):
        """Gracefully stop the consumer"""
        await self._consumer.stop()
        logger.info("Consumer stopped")

    async def consume_messages(self):
        """Consume messages and process them"""
        try:
            async for message in self._consumer:
                try:
                    logger.info(
                        f"Received message: partition={message.partition}, "
                        f"offset={message.offset}, key={message.key}, "
                        f"value={message.value}"
                    )

                    await self._process_message(message.value)
                except Exception as e:
                    logger.error(f"Error processing message: {e}")

        except Exception as e:
            logger.error(f"Consumer error: {e}")
        finally:
            await self.stop()

    async def _process_message(self, message: dict[str, any]):
        """Business logic for message processing"""
        logger.info(f"Processing message: {message}")

        if message.get("data", None) is None:
            logger.error(f"Got no message")
            return

        booking_data = json.loads(message.get("data"))

        create_booking_history_record_dto = CreateBookingHistoryRecordSchema(
            user_id=booking_data["user_id"],
            hotel_id=booking_data["hotel_id"],
            promo_code=booking_data["promo_code"],
            discount_percent=booking_data["discount_percent"],
            price=booking_data["price"],
            reason=booking_data["reason"],
            created=booking_data["created"],
            created_at=datetime.fromisoformat(booking_data["created_at"]),
        )

        message_type = message.get("type")

        if message_type == "booking_created":
            # additional logic for created booking
            await self._booking_history_record_services.create_booking_history_record(
                create_booking_history_record_dto
            )
        elif message_type == "booking_denied":
            # additional logic for denied booking
            await self._booking_history_record_services.create_booking_history_record(
                create_booking_history_record_dto
            )
        else:
            logger.warning(f"Unknown message type: {message.get('type')}")


consumer = KafkaConsumer(
    booking_history_record_services=booking_history_record_services,
    consumer_class=AIOKafkaConsumer,
)
