import json
import logging
from datetime import datetime, timezone


from aiokafka import AIOKafkaProducer


logging.basicConfig(level=logging.INFO)


logger = logging.getLogger("kafka-producer")


class KafkaEventPublisher:
    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        self.topic = "booking-history"

    async def start(self):
        await self.producer.start()
        logger.info("Kafka event publisher started")

    async def stop(self):
        await self.producer.stop()
        logger.info("Kafka event publisher stopped")

    async def publish(self, event: str, message: dict):
        try:
            await self.producer.send(
                
                topic=self.topic,
                value={
                    "type": event,
                    "data": message,
                    "timestamp": str(datetime.now(timezone.utc)),
                },
            )
            await self.producer.flush()
            logger.debug(f"Sent event {event} to Kafka")
        except Exception as e:
            logger.error(f"Failed to send event to Kafka: {e}")


kafka_event_publisher = KafkaEventPublisher()
