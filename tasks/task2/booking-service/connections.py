import json
import os
import time

import psycopg2
from kafka.errors import KafkaTimeoutError
from psycopg2.pool import ThreadedConnectionPool

from logger import log

db_pool: ThreadedConnectionPool | None = None
from kafka import KafkaProducer


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5433"))
DB_NAME = os.getenv("DB_NAME", "hotelio")
DB_USER = os.getenv("DB_USER", "hotelio")
DB_PASSWORD = os.getenv("DB_PASSWORD", "hotelio")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "booking-created")

GRPC_PORT = int(os.getenv("GRPC_PORT", "9090"))


def init_db_pool() -> None:
    global db_pool
    for attempt in range(1, 31):
        try:
            db_pool = ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
            )
            log.info("DB pool ready (host=%s, db=%s)", DB_HOST, DB_NAME)
            return
        except psycopg2.OperationalError as e:
            log.warning("DB not ready (attempt %d): %s", attempt, e)
            time.sleep(2)
    raise RuntimeError("DB unreachable")


def init_schema() -> None:
    """Создаём таблицу, если её нет"""
    conn = db_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS booking (
                    id               BIGSERIAL PRIMARY KEY,
                    user_id          TEXT NOT NULL,
                    hotel_id         TEXT NOT NULL,
                    promo_code       TEXT,
                    discount_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
                    price            DOUBLE PRECISION NOT NULL,
                    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking(user_id)"
            )
        conn.commit()
        log.info("DB schema ready")
    finally:
        db_pool.putconn(conn)


def make_producer() -> KafkaProducer:
    """Ждём Kafka и создаём producer."""
    for attempt in range(1, 31):
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                retries=5,
                linger_ms=10,
            )
            log.info("Kafka producer ready (bootstrap=%s)", KAFKA_BOOTSTRAP)
            return producer
        except KafkaTimeoutError as e:
            log.warning("Kafka not ready (attempt %d): %s", attempt, e)
            time.sleep(2)
    raise RuntimeError("Kafka unreachable")



def get_pool() -> ThreadedConnectionPool:
    if db_pool is None:
        raise RuntimeError("DB pool is not initialized")
    return db_pool