import asyncio
import json
import logging
import os
from datetime import datetime  # Добавили для парсинга строк дат
import asyncpg
from aiokafka import AIOKafkaConsumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('booking_history_service')

# Конфигурация из переменных окружения
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:29092')
KAFKA_TOPIC = 'booking-events'
KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'booking-history-consumers')

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://hotelio:hotelio@booking-service-db:5432/hotelio')


async def init_db_schema(pool):
    """Создает таблицу для истории бронирований, если она еще не создана."""
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS processed_bookings (
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
        """)
        logger.info('Database schema validated/created successfully.')


async def save_to_postgres(pool, data: dict):
    """Безопасно сохраняет распарсенный JSON в PostgreSQL."""
    query = """
        INSERT INTO processed_bookings (booking_id, user_id, hotel_id, promo_code, discount_percent, price, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (booking_id) DO NOTHING;
    """
    # Приводим входящий ID к строке для записи в VARCHAR(255)
    booking_id = str(data.get('id')) if data.get('id') is not None else None

    # Парсим строку даты в объект datetime, понимающий временные зоны (zulu/UTC)
    created_at_raw = data.get('created_at')
    created_at_dt = None

    if created_at_raw:
        try:
            # Заменяем 'Z' на '+00:00' для корректной обработки встроенным fromisoformat
            if isinstance(created_at_raw, str) and created_at_raw.endswith('Z'):
                created_at_raw = created_at_raw[:-1] + '+00:00'
            created_at_dt = datetime.fromisoformat(created_at_raw)
        except Exception as parse_err:
            logger.error(f"Failed to parse created_at timestamp '{created_at_raw}': {parse_err}")
            # В случае ошибки парсинга оставляем None или можно использовать datetime.now()

    async with pool.acquire() as conn:
        await conn.execute(
            query,
            booking_id,
            data.get('user_id'),
            data.get('hotel_id'),
            data.get('promo_code'),
            data.get('discount_percent'),
            data.get('price'),
            created_at_dt,  # Передаем валидный объект datetime вместо строки
        )


async def consume():
    """Основной цикл чтения сообщений из Kafka."""
    clean_db_url = DATABASE_URL
    if clean_db_url.startswith('postgresql+asyncpg://'):
        clean_db_url = clean_db_url.replace('postgresql+asyncpg://', 'postgresql://')

    db_pool = await asyncpg.create_pool(clean_db_url)
    await init_db_schema(db_pool)

    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=KAFKA_GROUP_ID,
        auto_offset_reset='earliest',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
    )

    await consumer.start()
    logger.info(f"Booking History Consumer started. Listening to '{KAFKA_TOPIC}'...")

    try:
        async for msg in consumer:
            logger.info(f'Received message from partition {msg.partition}, offset {msg.offset}')
            event_data = msg.value

            if event_data.get('event') == 'BOOKING_CREATED':
                try:
                    await save_to_postgres(db_pool, event_data)
                    logger.info(f'Booking {event_data.get("id")} successfully written to history database.')
                except Exception as db_err:
                    logger.error(f'Failed to write booking history to database: {db_err}')

    except asyncio.CancelledError:
        logger.info('Consumer task is cancelling...')
    finally:
        await consumer.stop()
        await db_pool.close()
        logger.info('Booking History Consumer and DB Pool stopped gracefully.')


if __name__ == '__main__':
    try:
        asyncio.run(consume())
    except KeyboardInterrupt:
        logger.info('Booking History Service stopped manually.')
