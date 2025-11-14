import json
import os

from aiokafka import AIOKafkaProducer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
TOPIC_BOOKINGS = "booking-events"

producer = None

async def init_producer():
    global producer
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode("utf-8")
    )
    await producer.start()

async def send_booking_event(booking):
    """
    booking: объект с полями id, user_id, hotel_id, promo_code, discount_percent, price, created_at
    """
    if producer is None:
        await init_producer()

    await producer.send_and_wait(TOPIC_BOOKINGS, {
        "id": str(booking.id),
        "user_id": booking.user_id,
        "hotel_id": booking.hotel_id,
        "promo_code": booking.promo_code,
        "discount_percent": booking.discount_percent,
        "price": booking.price,
        "created_at": booking.created_at.isoformat()
    })

async def close_producer():
    if producer:
        await producer.stop()
