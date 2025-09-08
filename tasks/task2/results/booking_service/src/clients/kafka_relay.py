import logging
from typing import Any

from kafka import KafkaProducer

from src.clients.kafka_msg_serialization_strategy import BaseKafkaMsgSerializeStrategy, KafkaJsonMsgSerializeStrategy
from src.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class KafkaRelay:
    def __init__(self, msg_serialize_strategy: BaseKafkaMsgSerializeStrategy):
        self._producer = KafkaProducer(
            bootstrap_servers=[settings.KAFKA_BOOTSTRAP_SERVER_ADDRESS],
            value_serializer=msg_serialize_strategy,
        )

    async def send_msg(self, topic: str, msg: Any, key: str | None):
        encoded_key = key.encode("utf-8") if key else None

        self._producer.send(topic, value=msg, key=encoded_key)

def get_kafka_relay() -> KafkaRelay:
    return KafkaRelay(msg_serialize_strategy=KafkaJsonMsgSerializeStrategy())

__all__ = [
    "KafkaRelay",
    "get_kafka_relay",
]