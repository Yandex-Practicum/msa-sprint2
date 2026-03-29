from __future__ import annotations

import json
import logging
import signal
import sys

from kafka import KafkaConsumer

from booking_history.config import KAFKA_BOOTSTRAP, KAFKA_GROUP, KAFKA_TOPIC
from booking_history.db import connect, init_schema, insert_event

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("booking_history")

_running = True


def main() -> None:
    global _running
    conn = connect()
    init_schema(conn)

    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
        group_id=KAFKA_GROUP,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )
    log.info("listening topic=%s group=%s", KAFKA_TOPIC, KAFKA_GROUP)

    def stop(*_a) -> None:
        global _running
        _running = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    try:
        while _running:
            records = consumer.poll(timeout_ms=1000)
            for _tp, batch in records.items():
                for msg in batch:
                    try:
                        insert_event(conn, msg.value)
                        log.info(
                            "stored booking_history bookingId=%s userId=%s hotelId=%s day=%s",
                            msg.value.get("bookingId"),
                            msg.value.get("userId"),
                            msg.value.get("hotelId"),
                            str(msg.value.get("createdAt", ""))[:10],
                        )
                    except Exception:
                        log.exception("failed to process message")
    finally:
        consumer.close()
        conn.close()
        sys.exit(0)


if __name__ == "__main__":
    main()
