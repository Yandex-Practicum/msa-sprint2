from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from kafka import KafkaProducer

from booking_service.config import KAFKA_BOOTSTRAP, KAFKA_TOPIC

log = logging.getLogger(__name__)


def _json_default(obj: Any) -> str:
    if isinstance(obj, datetime):
        if obj.tzinfo is None:
            obj = obj.replace(tzinfo=datetime.now().astimezone().tzinfo)
        return obj.isoformat()
    raise TypeError(type(obj))


class BookingEventProducer:
    def __init__(self) -> None:
        self._producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
            value_serializer=lambda v: json.dumps(v, default=_json_default).encode("utf-8"),
            retries=5,
            request_timeout_ms=30000,
        )

    def publish_created(
        self,
        booking_id: int,
        user_id: str,
        hotel_id: str,
        promo_code: str | None,
        discount_percent: float,
        price: float,
        created_at: datetime,
    ) -> None:
        payload = {
            "bookingId": booking_id,
            "userId": user_id,
            "hotelId": hotel_id,
            "promoCode": promo_code,
            "discountPercent": discount_percent,
            "price": price,
            "createdAt": created_at,
        }
        self._producer.send(KAFKA_TOPIC, value=payload)
        self._producer.flush(timeout=10)
        log.info("kafka event sent topic=%s id=%s", KAFKA_TOPIC, booking_id)

    def close(self) -> None:
        self._producer.close()
