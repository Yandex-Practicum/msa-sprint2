import os
import json
from datetime import datetime

import psycopg2
from confluent_kafka import Consumer


def apply_migrations():
    conn = psycopg2.connect(os.environ["DB_DSN"])
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(open(os.path.join(os.path.dirname(__file__), "migrations.sql"), "r", encoding="utf-8").read())
    finally:
        conn.close()


def main():
    apply_migrations()

    consumer = Consumer(
        {
            "bootstrap.servers": os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
            "group.id": os.environ.get("KAFKA_GROUP_ID", "booking-history-service"),
            "auto.offset.reset": "earliest",
        }
    )
    topic = os.environ.get("KAFKA_TOPIC", "booking.events")
    consumer.subscribe([topic])

    conn = psycopg2.connect(os.environ["DB_DSN"])

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                continue

            try:
                event = json.loads(msg.value().decode("utf-8"))
                event_id = event["event_id"]
                event_type = event["event_type"]
                occurred_at = datetime.fromisoformat(event["occurred_at"].replace("Z", "+00:00"))
                booking_id = event["booking"]["id"]
            except Exception:
                continue

            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into booking_history(event_id,event_type,occurred_at,booking_id,payload)
                        values(%s,%s,%s,%s,%s::jsonb)
                        on conflict (event_id) do nothing
                        """,
                        (event_id, event_type, occurred_at, booking_id, json.dumps(event, ensure_ascii=False)),
                    )
    finally:
        conn.close()
        consumer.close()


if __name__ == "__main__":
    main()