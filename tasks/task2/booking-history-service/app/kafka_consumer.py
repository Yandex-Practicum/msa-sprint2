import json
import logging
from kafka import KafkaConsumer
from kafka.admin import KafkaAdminClient, NewTopic
from sqlalchemy.exc import IntegrityError
from models import BookingHistory
from db import SessionLocal
from config import KAFKA_BOOTSTRAP_SERVERS, KAFKA_TOPIC
from datetime import datetime
from kafka.errors import TopicAlreadyExistsError


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("BookingHistoryService")


def ensure_topic():
    admin_client = KafkaAdminClient(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        client_id='booking-history-admin'
    )
    topic_list = [NewTopic(name=KAFKA_TOPIC, num_partitions=1, replication_factor=1)]
    try:
        admin_client.create_topics(new_topics=topic_list, validate_only=False)
        logger.info("Topic '%s' created successfully", KAFKA_TOPIC)
    except TopicAlreadyExistsError:
        logger.info("ℹTopic '%s' already exists", KAFKA_TOPIC)
    except Exception as e:
        logger.exception("Failed to create topic '%s': %s", KAFKA_TOPIC, e)
    finally:
        admin_client.close()


consumer = KafkaConsumer(
    KAFKA_TOPIC,
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    group_id='booking-history-group'
)


def consume():
    logger.info("Listening to Kafka topic '%s'...", KAFKA_TOPIC)
    for message in consumer:
        data = message.value
        logger.info("Received booking: %s", data)
        save_to_db(data)


def save_to_db(data):
    session = SessionLocal()
    booking = BookingHistory(
        id=data["id"],
        user_id=data["user_id"],
        hotel_id=data["hotel_id"],
        promo_code=data.get("promo_code", ""),
        discount_percent=data.get("discount_percent", 0.0),
        price=data["price"],
        created_at=data.get("created_at")
    )
    try:
        session.add(booking)
        session.commit()
        logger.info("Saved booking %s", booking.id)
    except IntegrityError:
        session.rollback()
        logger.warning("Booking %s already exists", booking.id)
    except Exception as e:
        session.rollback()
        logger.exception("Error saving booking %s: %s", booking.id, e)
    finally:
        session.close()


if __name__ == "__main__":
    ensure_topic()
    consume()
