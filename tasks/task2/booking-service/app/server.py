from concurrent import futures
from datetime import datetime, timezone
import uuid
import grpc

from booking_pb2 import BookingResponse, BookingListResponse
import booking_pb2_grpc

from kafka_producer import BookingEventsProducer


# На первом шаге можно in-memory, дальше легко заменить на Postgres
_BOOKINGS = []  # list[dict]


def _calc_discount_percent(promo_code: str) -> float:
    if not promo_code:
        return 0.0
    # пример логики
    if promo_code.upper() == "SALE10":
        return 10.0
    if promo_code.upper() == "SALE20":
        return 20.0
    return 0.0


def _calc_price(hotel_id: str, discount_percent: float) -> float:
    base = 100.0  # заглушка
    return base * (1.0 - discount_percent / 100.0)


class BookingServiceServicer(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self, events_producer: BookingEventsProducer | None):
        self.events_producer = events_producer

    def CreateBooking(self, request, context):
        booking_id = str(uuid.uuid4())
        discount = _calc_discount_percent(request.promo_code)
        price = _calc_price(request.hotel_id, discount)
        created_at = datetime.now(timezone.utc).isoformat()

        booking = {
            "id": booking_id,
            "user_id": request.user_id,
            "hotel_id": request.hotel_id,
            "promo_code": request.promo_code or "",
            "discount_percent": discount,
            "price": price,
            "created_at": created_at,
        }

        _BOOKINGS.append(booking)

        # Пушим событие в Kafka
        if self.events_producer is not None:
            self.events_producer.publish_booking_created(booking)

        return BookingResponse(**booking)

    def ListBookings(self, request, context):
        items = [b for b in _BOOKINGS if b["user_id"] == request.user_id]
        return BookingListResponse(bookings=[BookingResponse(**b) for b in items])


def serve():
    # В docker-compose Kafka будет доступна как "kafka:9092"
    producer = BookingEventsProducer(
        bootstrap_servers="kafka:9092",
        topic="booking.events",
    )

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(
        BookingServiceServicer(events_producer=producer),
        server,
    )
    server.add_insecure_port("[::]:9090")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()