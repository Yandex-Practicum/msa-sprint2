import json
import os
from datetime import datetime

import psycopg2
from confluent_kafka import Consumer


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hotel_id TEXT NOT NULL,
  promo_code TEXT,
  discount_percent DOUBLE PRECISION NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);
"""

UPSERT_SQL = """
INSERT INTO bookings
(id, user_id, hotel_id, promo_code, discount_percent, price, created_at, occurred_at)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  hotel_id = EXCLUDED.hotel_id,
  promo_code = EXCLUDED.promo_code,
  discount_percent = EXCLUDED.discount_percent,
  price = EXCLUDED.price,
  created_at = EXCLUDED.created_at,
  occurred_at = EXCLUDED.occurred_at;
"""


def parse_ts(s: str) -> datetime:
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


def main():
    dsn = os.getenv("DB_DSN")
    if not dsn:
        raise RuntimeError("DB_DSN is required")

    topic = os.getenv("KAFKA_TOPIC", "booking.events")
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    group_id = os.getenv("KAFKA_GROUP_ID", "booking-history-service")

    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(CREATE_TABLE_SQL)

    c = Consumer({
        "bootstrap.servers": bootstrap,
        "group.id": group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
    })

    c.subscribe([topic])
    print(f"Listening {topic}... and writing to Postgres")

    try:
        while True:
            msg = c.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                print("Kafka error:", msg.error())
                continue

            event = json.loads(msg.value().decode("utf-8"))

            if event.get("event_type") != "BOOKING_CREATED":
                c.commit(message=msg, asynchronous=False)
                continue

            payload = event.get("payload") or {}
            occurred_at = event.get("occurred_at") or payload.get("created_at")

            try:
                row = (
                    payload["id"],
                    payload["user_id"],
                    payload["hotel_id"],
                    payload.get("promo_code", ""),
                    float(payload.get("discount_percent", 0.0)),
                    float(payload.get("price", 0.0)),
                    parse_ts(payload["created_at"]),
                    parse_ts(occurred_at),
                )
            except Exception as e:
                print("Bad payload, skip:", e, payload)
                c.commit(message=msg, asynchronous=False)
                continue

            try:
                with conn.cursor() as cur:
                    cur.execute(UPSERT_SQL, row)
                c.commit(message=msg, asynchronous=False)
                print("Saved booking:", payload["id"])
            except Exception as e:
                print("DB error, will retry:", e)

    finally:
        c.close()
        conn.close()


if __name__ == "__main__":
    main()