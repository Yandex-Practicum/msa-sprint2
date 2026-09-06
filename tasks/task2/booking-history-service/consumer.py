import json
import os
import time

import psycopg2
from kafka import KafkaConsumer

DB_HOST = os.getenv("DB_HOST", "history-db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "booking_history")
DB_USER = os.getenv("DB_USER", "hotelio")
DB_PASSWORD = os.getenv("DB_PASSWORD", "hotelio")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "booking-created")


def get_conn():
    for attempt in range(30):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
                user=DB_USER, password=DB_PASSWORD,
            )
            return conn
        except psycopg2.OperationalError as e:
            print(f"[booking-history] DB not ready ({attempt}): {e}", flush=True)
            time.sleep(2)
    raise RuntimeError("DB unreachable")


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS booking_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            hotel_id TEXT NOT NULL,
            promo_code TEXT,
            discount_percent DOUBLE PRECISION DEFAULT 0,
            price DOUBLE PRECISION NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            received_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS booking_stats_daily (
            stat_date DATE NOT NULL,
            user_id TEXT NOT NULL,
            hotel_id TEXT NOT NULL,
            bookings_count BIGINT DEFAULT 0,
            total_revenue DOUBLE PRECISION DEFAULT 0,
            PRIMARY KEY (stat_date, user_id, hotel_id)
        )
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("[booking-history] DB schema ready", flush=True)


def consume():
    init_db()
    for attempt in range(30):
        try:
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP,
                auto_offset_reset="earliest",
                enable_auto_commit=True,
                group_id="booking-history-service",
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                consumer_timeout_ms=1000,
            )
            break
        except Exception as e:
            print(f"[booking-history] Kafka not ready ({attempt}): {e}", flush=True)
            time.sleep(2)
    else:
        raise RuntimeError("Kafka unreachable")

    print(f"[booking-history] consuming {KAFKA_TOPIC}", flush=True)
    while True:
        try:
            for msg in consumer:
                evt = msg.value
                conn = get_conn()
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO booking_history (id, user_id, hotel_id, promo_code, discount_percent, price, created_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (evt.get("id"), evt.get("userId"), evt.get("hotelId"),
                     evt.get("promoCode"), evt.get("discountPercent"), evt.get("price"),
                     evt.get("createdAt")),
                )
                cur.execute("""
                    INSERT INTO booking_stats_daily (stat_date, user_id, hotel_id, bookings_count, total_revenue)
                    VALUES (%s, %s, %s, 1, %s)
                    ON CONFLICT (stat_date, user_id, hotel_id)
                    DO UPDATE SET bookings_count = booking_stats_daily.bookings_count + 1,
                                  total_revenue = booking_stats_daily.total_revenue + EXCLUDED.total_revenue
                """, (evt.get("createdAt", "")[:10], evt.get("userId"), evt.get("hotelId"), evt.get("price", 0)))
                conn.commit()
                cur.close()
                conn.close()
                print(f"[booking-history] stored {evt.get('id')} user={evt.get('userId')} "
                      f"hotel={evt.get('hotelId')} price={evt.get('price')}", flush=True)
        except Exception as e:
            print(f"[booking-history] consume error: {e}", flush=True)
            time.sleep(3)


if __name__ == "__main__":
    consume()
