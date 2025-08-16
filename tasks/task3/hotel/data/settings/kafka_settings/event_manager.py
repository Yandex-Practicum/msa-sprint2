import logging

from settings.kafka_settings.publisher import kafka_event_publisher
from settings.kafka_settings.schemas import MessageType, PublishCallbackType

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("event-system")


class AsyncEventManager:
    def __init__(self, publish_callback: PublishCallbackType):
        self._publish_callback = publish_callback

    async def publish(
        self,
        event_type: str,
        message: MessageType,
    ) -> None:
        await self._publish_callback(event_type, message)

    def set_publish_callback(self, publish_callback: PublishCallbackType) -> None:
        self._publish_callback = publish_callback


async_event_manager = AsyncEventManager(publish_callback=kafka_event_publisher.publish)
