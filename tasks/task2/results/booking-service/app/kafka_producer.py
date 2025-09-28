import json
import logging
from kafka import KafkaProducer
from kafka.errors import KafkaError

logger = logging.getLogger(__name__)


class BookingKafkaProducer:
    def __init__(self, bootstrap_servers: str = 'kafka:9092'):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None
        self.connect()

    def connect(self):
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=[self.bootstrap_servers],
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                acks='all',
                retries=3
            )
            logger.info(f"Connected to Kafka at {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            self.producer = None

    def send_booking_created_event(self, booking_data: dict):
        """Отправка события о создании бронирования"""
        if not self.producer:
            logger.error("Kafka producer not connected")
            return False

        try:
            event = {
                "event_type": "BookingCreated",
                "booking_id": booking_data["id"],
                "user_id": booking_data["user_id"],
                "hotel_id": booking_data["hotel_id"],
                "price": booking_data["price"],
                "discount_percent": booking_data["discount_percent"],
                "created_at": booking_data["created_at"],
                "promo_code": booking_data.get("promo_code")
            }

            future = self.producer.send('booking-events', event)
            future.get(timeout=10)  # Wait for confirmation
            logger.info(
                f"BookingCreated event sent for booking {booking_data['id']}")
            return True

        except KafkaError as e:
            logger.error(f"Kafka error sending event: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending booking event: {e}")
            return False

    def close(self):
        if self.producer:
            self.producer.close()
            logger.info("Kafka producer closed")