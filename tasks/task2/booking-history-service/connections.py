import time

import psycopg2
from kafka import KafkaConsumer
from kafka.errors import KafkaTimeoutError
from psycopg2.pool import ThreadedConnectionPool

from config import (
    KAFKA_BOOTSTRAP,
    KAFKA_TOPIC,
    KAFKA_GROUP_ID,
    KAFKA_AUTO_OFFSET_RESET, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
)
from logger import log

db_pool: ThreadedConnectionPool | None = None


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
                CREATE TABLE IF NOT EXISTS booking_history (
                id BIGSERIAL PRIMARY KEY,
                booking_id VARCHAR(255) NOT NULL UNIQUE,
                user_id VARCHAR(255) NOT NULL,
                hotel_id VARCHAR(255) NOT NULL,
                promo_code VARCHAR(100),
                discount_percent NUMERIC(5, 2),
                price NUMERIC(12, 2),
                created_at TIMESTAMP WITH TIME ZONE,
                saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
            )
        conn.commit()
        log.info("DB schema ready")
    finally:
        db_pool.putconn(conn)


def get_pool() -> ThreadedConnectionPool:
    if db_pool is None:
        raise RuntimeError("DB pool is not initialized")
    return db_pool


def make_consumer() -> KafkaConsumer:
    """Ждём Kafka и создаём consumer. Manual commit — оффсет коммит после обработки."""
    for attempt in range(1, 31):
        try:
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP,
                group_id=KAFKA_GROUP_ID,
                auto_offset_reset=KAFKA_AUTO_OFFSET_RESET,
                enable_auto_commit=False,
                value_deserializer=lambda v: __import__("json").loads(v.decode("utf-8")),
                consumer_timeout_ms=1000,
            )
            log.info(
                "Kafka consumer ready (bootstrap=%s, topic=%s, group=%s)",
                KAFKA_BOOTSTRAP, KAFKA_TOPIC, KAFKA_GROUP_ID,
            )
            return consumer
        except KafkaTimeoutError as e:
            log.warning("Kafka not ready (attempt %d): %s", attempt, e)
            time.sleep(2)
    raise RuntimeError("Kafka unreachable")
