import asyncio
import logging

from aiokafka import AIOKafkaConsumer

from source.clients.kafka_msg_deserialization_strategy import (
    BaseKafkaMsgDeserializeStrategy,
    KafkaJsonMsgDeserializeStrategy,
)
from source.settings import get_settings
from source.types import NewBookingMessage

logger = logging.getLogger(__name__)
settings = get_settings()


class KafkaRelay:
    def __init__(self, msg_deserialize_strategy: BaseKafkaMsgDeserializeStrategy):
        self._msg_deserialize_strategy = msg_deserialize_strategy
        self._consumer: AIOKafkaConsumer | None = None
        self._lock = asyncio.Lock()

    async def _bootstrap(self):
        if self._consumer is None:
            async with self._lock:
                if self._consumer is None:
                    self._consumer = AIOKafkaConsumer(
                        settings.KAFKA_NEW_BOOKING_TOPIC_NAME,
                        bootstrap_servers=[settings.KAFKA_BOOTSTRAP_SERVER_ADDRESS],
                        enable_auto_commit=True,
                        isolation_level="read_committed",
                        value_deserializer=self._msg_deserialize_strategy,
                        auto_offset_reset="latest",
                    )

        return self._consumer

    async def activate(self):
        self._consumer = await self._bootstrap()

        await self._consumer.start()

    async def deactivate(self):
        await self._consumer.stop()

    async def consume_msg(self) -> NewBookingMessage:
        return await self._consumer.getone()

def get_kafka_relay() -> KafkaRelay:
    return KafkaRelay(msg_deserialize_strategy=KafkaJsonMsgDeserializeStrategy())

__all__ = [
    "KafkaRelay",
    "get_kafka_relay",
]