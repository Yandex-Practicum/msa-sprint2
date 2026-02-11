import json
import logging

from kafka import KafkaProducer

from config import settings

logger = logging.getLogger(__name__)

_producer: KafkaProducer | None = None


def get_producer() -> KafkaProducer | None:
    global _producer
    if _producer is not None:
        return _producer
    try:
        _producer = KafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        logger.info("Kafka producer connected to %s", settings.kafka_bootstrap_servers)
    except Exception as e:
        logger.error("Could not create Kafka producer: %s", e)
    return _producer


def publish(event: dict) -> None:
    producer = get_producer()
    if producer is None:
        logger.warning("Kafka producer unavailable, skipping event publish")
        return
    try:
        producer.send(settings.kafka_topic, event)
        producer.flush()
        logger.info("Booking event published to Kafka: id=%s", event.get("id"))
    except Exception as e:
        logger.error("Failed to publish Kafka event: %s", e)
