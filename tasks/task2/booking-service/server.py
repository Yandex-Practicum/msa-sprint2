import os
from asyncio import futures
from concurrent import futures
from datetime import timezone

import grpc
from kafka import KafkaProducer

import booking_pb2
import booking_pb2_grpc
from client import MonolithClient, MonolithError
from connections import init_db_pool, init_schema, make_producer, GRPC_PORT, KAFKA_TOPIC, get_pool, db_pool
from logger import log

VIP_BASE_PRICE = 80.0
DEFAULT_BASE_PRICE = 100.0

MONOLITH_URL = os.getenv("MONOLITH_URL", "http://localhost:8080")
MONOLITH_TIMEOUT = float(os.getenv("MONOLITH_TIMEOUT", "5"))


class BookingServicer(booking_pb2_grpc.BookingServiceServicer):

    def __init__(self, producer: KafkaProducer, monolith: MonolithClient):
        self.producer = producer
        self.monolith = monolith

    @staticmethod
    def _row_to_proto(r) -> booking_pb2.BookingResponse:
        return booking_pb2.BookingResponse(
            id=str(r[0]),
            user_id=r[1],
            hotel_id=r[2],
            promo_code=r[3] or "",
            discount_percent=float(r[4] or 0),
            price=float(r[5] or 0),
            created_at=r[6].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        )

    def ListBookings(self, request, context):
        user_id = request.user_id.strip()
        log.info("ListBookings user=%s", user_id)

        if not user_id:
            query = """
            SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at
            FROM booking
            ORDER BY id DESC
            """
        else:
            query = """
            SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at
            FROM booking
            WHERE user_id = %s
            ORDER BY id DESC
            """
        pool = get_pool()
        conn = pool.getconn()

        try:
            with conn.cursor() as cur:
                if user_id:
                    cur.execute(query, (user_id,), )
                else:
                    cur.execute(query)
                rows = cur.fetchall()
        finally:
            pool.putconn(conn)

        bookings = [self._row_to_proto(r) for r in rows]
        log.info("ListBookings user=%s -> %d rows", user_id, len(bookings))

        return booking_pb2.BookingListResponse(bookings=bookings)

    def CreateBooking(self, request, context):
        user_id = request.user_id.strip()
        hotel_id = request.hotel_id.strip()
        promo_code = (request.promo_code or "").strip() or None

        log.info("CreateBooking user=%s hotel=%s promo=%r", user_id, hotel_id, promo_code)

        if not user_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "user_id is required")
        if not hotel_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "hotel_id is required")

        user = self.monolith.get_user(user_id)

        self._validate_user(context, user)

        self._validate_hotel(context, hotel_id)

        base_price = self._resolve_base_price(user)

        discount = self._resolve_promo_discount(promo_code, user_id)
        final_price = base_price - discount

        booking_id, created_at_iso = self._insert_booking(
            context, user_id, hotel_id, promo_code, discount, final_price
        )

        self._publish_booking_event(
            context=context,
            booking_id=booking_id,
            user_id=user_id,
            hotel_id=hotel_id,
            promo_code=promo_code,
            discount=discount,
            price=final_price,
            created_at_iso=created_at_iso,
        )

        return booking_pb2.BookingResponse(
            id=str(booking_id),
            user_id=user_id,
            hotel_id=hotel_id,
            promo_code=promo_code or "",
            discount_percent=discount,
            price=final_price,
            created_at=created_at_iso,
        )

    def _get_user(self, context, user_id):
        try:
            return self.monolith.get_user(user_id)
        except LookupError:
            context.abort(grpc.StatusCode.NOT_FOUND, f"User {user_id} not found")
        except MonolithError as e:
            log.error("Monolith user lookup failed: %s", e)
            context.abort(grpc.StatusCode.UNAVAILABLE, "User service unavailable")

    def _validate_user(self, context, user):
        if user["active"] is False:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "user not active")
        if user["blacklisted"] is True:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "user blacklisted")

    def _validate_hotel(self, context, hotel_id):
        try:
            hotel: dict = self.monolith.get_hotel(hotel_id)
            if hotel["operational"] is False:
                log.error("Hotel %s not operational", hotel_id)
                context.abort(grpc.StatusCode.CANCELLED, "Hotel is not operational")
            if not self.monolith.is_trusted_hotel(hotel_id):
                log.error("Hotel %s not trusted", hotel_id)
                context.abort(grpc.StatusCode.CANCELLED, "Hotel is not trusted based on reviews")
            if hotel["fullyBooked"] is True:
                log.error("Hotel %s fully booked", hotel_id)
                context.abort(grpc.StatusCode.CANCELLED, "Hotel is not fully booked")
        except LookupError:
            context.abort(grpc.StatusCode.NOT_FOUND, "Hotel not found")
        except MonolithError as e:
            log.error("Monolith hotel lookup failed: %s", e)
            context.abort(grpc.StatusCode.NOT_FOUND, "Hotel service unavailable")

    def _resolve_base_price(self, user: dict) -> float:
        status = (user["status"] or "").strip()

        if not status:
            return DEFAULT_BASE_PRICE

        if status.upper() == "VIP":
            return VIP_BASE_PRICE
        return DEFAULT_BASE_PRICE

    def _resolve_promo_discount(self, promo_code: str | None, user_id: str) -> float:
        if not promo_code:
            return 0.0

        discount = self.monolith.get_promo_discount(promo_code, user_id)
        if not discount:
            return 0.0
        if discount["expired"]:
            return 0.0
        return discount["discount"]

    def _insert_booking(self, context, user_id, hotel_id, promo_code,
                        discount, price) -> tuple[int, str]:
        pool = get_pool()
        conn = pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO booking
                        (user_id, hotel_id, promo_code, discount_percent, price)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, created_at
                    """,
                    (user_id, hotel_id, promo_code, discount, price),
                )
                row = cur.fetchone()
            conn.commit()
        except Exception:
            conn.rollback()
            log.exception("DB insert failed")
            context.abort(grpc.StatusCode.INTERNAL, "Failed to save booking")
        finally:
            pool.putconn(conn)

        booking_id = row[0]
        created_at_iso = row[1].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        log.info("Booking saved id=%s user=%s hotel=%s price=%.2f",
                 booking_id, user_id, hotel_id, price)
        return booking_id, created_at_iso

    def _publish_booking_event(self, context, booking_id, user_id, hotel_id,
                               promo_code, discount, price, created_at_iso) -> None:
        event = {
            "id": str(booking_id),
            "userId": user_id,
            "hotelId": hotel_id,
            "promoCode": promo_code,
            "discountPercent": discount,
            "price": price,
            "createdAt": created_at_iso,
        }
        try:
            self.producer.send(KAFKA_TOPIC, event).get(timeout=5)
            log.info("Published to %s: %s", KAFKA_TOPIC, event)
        except Exception:
            log.exception("Kafka publish failed for booking %s", booking_id)
            context.abort(
                grpc.StatusCode.UNAVAILABLE,
                "Booking saved but event publish failed",
            )


def serve() -> None:
    init_db_pool()
    init_schema()
    producer = make_producer()
    monolith = MonolithClient(MONOLITH_URL, MONOLITH_TIMEOUT)

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(
        BookingServicer(producer, monolith), server
    )
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    log.info("Booking gRPC server listening on :%d", GRPC_PORT)

    try:
        server.wait_for_termination()
    finally:
        log.info("Shutting down")
        producer.close()
        monolith.session.close()
        if db_pool:
            db_pool.closeall()
