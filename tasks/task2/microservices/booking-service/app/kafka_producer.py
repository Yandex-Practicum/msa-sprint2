import json
from kafka import KafkaProducer
from config import KAFKA_HOST, KAFKA_TOPIC
from logger import logger

class BookingProducer:
    def __init__(self):
        self.producer = KafkaProducer(
            bootstrap_servers=KAFKA_HOST,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )

    def publish_booking_event(self, booking):
        event = {
            "id": str(booking.id),
            "user_id": booking.user_id,
            "hotel_id": booking.hotel_id,
            "promo_code": booking.promo_code or "",
            "discount_percent": booking.discount_percent or 0.0,
            "price": booking.price,
            "created_at": booking.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        }

        try:
            self.producer.send(KAFKA_TOPIC, value=event)
            self.producer.flush()
            logger.info("Published booking event: %s", event)
        except Exception as e:
            logger.error("Error publishing booking event: %s", e)
