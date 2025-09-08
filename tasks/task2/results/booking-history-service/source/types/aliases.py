from typing import TypeAlias, Dict

from aiokafka import ConsumerRecord

NewBookingMessage: TypeAlias = ConsumerRecord[str | None, Dict]

__all__ = [
    "NewBookingMessage",
]