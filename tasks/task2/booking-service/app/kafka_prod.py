from kafka import KafkaProducer
import json
from config import KAFKA_BOOTSTRAP_SERVERS

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def publish_booking_event(booking):
    event = {
        "id": str(booking.id),
        "user_id": booking.user_id,
        "hotel_id": booking.hotel_id,
        "promo_code": booking.promo_code or "",
        "discount_percent": booking.discount_percent or 0.0,
        "price": booking.price,
        "created_at": booking.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    }
    producer.send("booking.created", value=event)
    producer.flush()
