import json
import logging
from typing import Dict, Any
from aiokafka import AIOKafkaConsumer

from files.services import BookingHistoryRecordServices, booking_history_record_services
from tasks.booking_history.data.files.schemas import BookingHistoryRecordSchema

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kafka-consumer")


class KafkaConsumer:
    def __init__(
        self,
        booking_history_record_services: BookingHistoryRecordServices,
        topic: str = "booking-history",
        bootstrap_servers: str = "localhost:9092",
        group_id: str = "booking-group",
    ):
        self._booking_history_record_services = booking_history_record_services
        self._consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="earliest",  # Start from beginning if no offset
        )

    async def start(self):
        """Start the Kafka consumer"""
        await self._consumer.start()
        logger.info(f"Consumer started for topic: {self._consumer.topics()}")

    async def stop(self):
        """Gracefully stop the consumer"""
        await self._consumer.stop()
        logger.info("Consumer stopped")

    async def consume_messages(self):
        """Consume messages and process them"""
        try:
            async for message in self._consumer:
                try:
                    print(message.value)

                    logger.info(
                        f"Received message: partition={message.partition}, "
                        f"offset={message.offset}, key={message.key}, "
                        f"value={message.value}"
                    )
                    await self._process_message(message.value)
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    # Add your error handling logic here
                    # (e.g., push to dead-letter queue)

        except Exception as e:
            logger.error(f"Consumer error: {e}")
        finally:
            await self.stop()

    async def _process_message(self, message: Dict[str, Any]):
        """Business logic for message processing"""
        # Replace with your actual processing logic
        logger.info(f"Processing message: {message}")

        # Example processing:
        if message.get("type") == "booking_created":
            await self.handle_booking_created(message.get("data"))
        else:
            logger.warning(f"Unknown message type: {message.get('type')}")

    async def handle_booking_created(self, booking_data: Dict[str, Any]):
        """Process booking created event"""
        logger.info(f"Handling new booking: {booking_data}")
        create_booking_history_record_dto = BookingHistoryRecordSchema(
            user_id="user_id",
            hotel_id="hotel_id",
            promo_code="promo_code",
            discount_percent="discount",
            price="finalPrice",
        )

        await self._booking_history_record_services(create_booking_history_record_dto)


consumer = KafkaConsumer(
    booking_history_record_services=booking_history_record_services
)
