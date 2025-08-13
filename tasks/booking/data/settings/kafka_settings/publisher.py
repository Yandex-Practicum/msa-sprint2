import json
import logging
from datetime import datetime, timezone

from settings.settings import settings


from aiokafka import AIOKafkaProducer


logging.basicConfig(level=logging.INFO)


logger = logging.getLogger("kafka-producer")


class KafkaEventPublisher:
    def __init__(
        self,
        bootstrap_servers: str = settings.kafka_url,
        producer_class: AIOKafkaProducer = AIOKafkaProducer,
    ):
        self._bootstrap_servers = bootstrap_servers
        self._topic = "booking-history"
        self._producer_class = producer_class
        self._producer: AIOKafkaProducer = None

    async def start(self):

        self._producer = self._producer_class(
            bootstrap_servers=self._bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        await self._producer.start()
        logger.info("Kafka event publisher started")

    async def stop(self):
        await self._producer.stop()
        logger.info("Kafka event publisher stopped")

    async def publish(self, event: str, message: dict[str, any]):
        try:
            data = json.dumps(message)
            await self._producer.send(
                topic=self._topic,
                value={
                    "type": event,
                    "data": data,
                    "timestamp": str(datetime.now(timezone.utc)),
                },
            )
            await self._producer.flush()
            logger.debug(f"Sent event {event} to Kafka")
        except Exception as e:
            logger.error(f"Failed to send event to Kafka: {e}")


kafka_event_publisher = KafkaEventPublisher()
