import json
from datetime import datetime, timezone

from confluent_kafka import Producer


class BookingEventsProducer:
    def __init__(self, bootstrap_servers: str, topic: str):
        self.topic = topic
        self.producer = Producer({"bootstrap.servers": bootstrap_servers})

    def publish_booking_created(self, booking: dict) -> None:
        # booking уже содержит все нужные поля
        event = {
            "event_type": "BOOKING_CREATED",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": booking,
        }
        self.producer.produce(self.topic, json.dumps(event).encode("utf-8"))
        self.producer.flush(5)