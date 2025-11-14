import asyncio
import json
from aiokafka import AIOKafkaConsumer
from models import BookingHistory, AsyncSessionLocal, init_db
from datetime import datetime

KAFKA_BROKER = "kafka:9092"
TOPIC_BOOKINGS = "booking-events"

async def consume_booking_events():
    await init_db()

    consumer = AIOKafkaConsumer(
        TOPIC_BOOKINGS,
        bootstrap_servers=KAFKA_BROKER,
        group_id="booking-history-group",
        auto_offset_reset="earliest"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            data = json.loads(msg.value.decode("utf-8"))
            await save_booking(data)
    finally:
        await consumer.stop()

async def save_booking(data):
    async with AsyncSessionLocal() as session:
        booking = BookingHistory(
            id=data["id"],
            user_id=data["user_id"],
            hotel_id=data["hotel_id"],
            promo_code=data.get("promo_code"),
            discount_percent=data["discount_percent"],
            price=data["price"],
            created_at=datetime.fromisoformat(data["created_at"])
        )
        session.add(booking)
        await session.commit()
        print(f"✅ Saved booking {booking.id} for user {booking.user_id}")
