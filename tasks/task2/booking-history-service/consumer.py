import json
import logging
import time

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable

from config import settings
from database import SessionLocal
from models import BookingHistory

logger = logging.getLogger(__name__)


def _save(event: dict) -> None:
    with SessionLocal() as session:
        record = BookingHistory(
            booking_id=event.get("id"),
            user_id=event.get("userId"),
            hotel_id=event.get("hotelId"),
            promo_code=event.get("promoCode"),
            discount_pct=event.get("discountPercent", 0.0),
            price=event.get("price"),
            created_at=event.get("createdAt"),
        )
        session.add(record)
        session.commit()
        logger.info(
            "Saved booking_history: booking_id=%s user_id=%s hotel_id=%s",
            record.booking_id,
            record.user_id,
            record.hotel_id,
        )


def run_consumer() -> None:
    for attempt in range(30):
        try:
            consumer = KafkaConsumer(
                settings.kafka_topic,
                bootstrap_servers=settings.kafka_bootstrap_servers,
                auto_offset_reset="earliest",
                group_id="booking-history-service",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )
            logger.info("Kafka consumer connected, topic=%s", settings.kafka_topic)
            for message in consumer:
                _save(message.value)
            return
        except NoBrokersAvailable:
            logger.warning("Kafka not ready (attempt %d/30), retrying…", attempt + 1)
            time.sleep(3)
        except Exception as e:
            logger.error("Kafka consumer error: %s", e)
            time.sleep(3)

    logger.error("Could not connect to Kafka after 30 attempts")
