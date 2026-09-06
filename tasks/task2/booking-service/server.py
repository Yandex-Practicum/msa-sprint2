from concurrent import futures
import json
import os
import time
from datetime import datetime, timezone

import grpc
import psycopg2
import requests
from kafka import KafkaProducer

import booking_pb2
import booking_pb2_grpc

DB_HOST = os.getenv("DB_HOST", "booking-db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "booking_service")
DB_USER = os.getenv("DB_USER", "hotelio")
DB_PASSWORD = os.getenv("DB_PASSWORD", "hotelio")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "booking-created")

GRPC_PORT = os.getenv("GRPC_PORT", "9090")

# Монолит остаётся источником данных по пользователям, отелям, промокодам и отзывам.
MONOLITH_URL = os.getenv("MONOLITH_URL", "http://hotelio-monolith:8080")


def get_conn():
    for attempt in range(30):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
                user=DB_USER, password=DB_PASSWORD,
            )
            return conn
        except psycopg2.OperationalError as e:
            print(f"[booking-service] DB not ready ({attempt}): {e}", flush=True)
            time.sleep(2)
    raise RuntimeError("DB unreachable")


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS booking (
            id BIGSERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            hotel_id TEXT NOT NULL,
            promo_code TEXT,
            discount_percent DOUBLE PRECISION DEFAULT 0,
            price DOUBLE PRECISION NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("[booking-service] DB schema ready", flush=True)


def make_producer():
    for attempt in range(30):
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                acks="all",
                retries=5,
            )
            return producer
        except Exception as e:
            print(f"[booking-service] Kafka not ready ({attempt}): {e}", flush=True)
            time.sleep(2)
    raise RuntimeError("Kafka unreachable")


class BookingService(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self, producer):
        self.producer = producer

    def CreateBooking(self, request, context):
        user_id = request.user_id
        hotel_id = request.hotel_id
        promo_code = request.promo_code or ""

        try:
            # --- данные получаются через REST от монолита (логика остальных сервисов не переносится) ---
            user = requests.get(f"{MONOLITH_URL}/api/users/{user_id}", timeout=5).json()
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(f"User {user_id} not found")
            return booking_pb2.BookingResponse()

        if not user.get("active"):
            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
            context.set_details("User is inactive")
            return booking_pb2.BookingResponse()
        if user.get("blacklisted"):
            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
            context.set_details("User is blacklisted")
            return booking_pb2.BookingResponse()

        is_vip = str(user.get("status", "")).upper() == "VIP"
        base_price = 80.0 if is_vip else 100.0

        try:
            operational = requests.get(f"{MONOLITH_URL}/api/hotels/{hotel_id}/operational", timeout=5).json()
            fully_booked = requests.get(f"{MONOLITH_URL}/api/hotels/{hotel_id}/fully-booked", timeout=5).json()
            trusted = requests.get(f"{MONOLITH_URL}/api/reviews/hotel/{hotel_id}/trusted", timeout=5).json()
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(f"Hotel {hotel_id} not found")
            return booking_pb2.BookingResponse()

        if not operational:
            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
            context.set_details("Hotel is not operational")
            return booking_pb2.BookingResponse()
        if fully_booked:
            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
            context.set_details("Hotel is fully booked")
            return booking_pb2.BookingResponse()
        if not trusted:
            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
            context.set_details("Hotel is not trusted based on reviews")
            return booking_pb2.BookingResponse()

        discount = 0.0
        if promo_code:
            try:
                promo = requests.post(
                    f"{MONOLITH_URL}/api/promos/validate",
                    params={"code": promo_code, "userId": user_id},
                    timeout=5,
                )
                if promo.status_code == 200:
                    discount = float(promo.json().get("discountPercent", promo.json().get("discount", 0)))
            except Exception:
                discount = 0.0

        final_price = base_price - discount

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at",
            (user_id, hotel_id, promo_code or None, discount, final_price),
        )
        row = cur.fetchone()
        conn.commit()
        booking_id = row[0]
        created_at = row[1].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        cur.close()
        conn.close()

        event = {
            "id": str(booking_id),
            "userId": user_id,
            "hotelId": hotel_id,
            "promoCode": promo_code or None,
            "discountPercent": discount,
            "price": final_price,
            "createdAt": created_at,
        }
        self.producer.send(KAFKA_TOPIC, event)
        self.producer.flush()
        print(f"[booking-service] published {KAFKA_TOPIC}: {json.dumps(event)}", flush=True)

        return booking_pb2.BookingResponse(
            id=str(booking_id),
            user_id=user_id,
            hotel_id=hotel_id,
            promo_code=promo_code,
            discount_percent=discount,
            price=final_price,
            created_at=created_at,
        )

    def ListBookings(self, request, context):
        conn = get_conn()
        cur = conn.cursor()
        if request.user_id:
            cur.execute(
                "SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at "
                "FROM booking WHERE user_id=%s ORDER BY id", (request.user_id,))
        else:
            cur.execute(
                "SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at "
                "FROM booking ORDER BY id")
        rows = cur.fetchall()
        cur.close()
        conn.close()

        bookings = []
        for r in rows:
            bookings.append(booking_pb2.BookingResponse(
                id=str(r[0]),
                user_id=r[1],
                hotel_id=r[2],
                promo_code=r[3] or "",
                discount_percent=float(r[4] or 0),
                price=float(r[5] or 0),
                created_at=r[6].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            ))
        return booking_pb2.BookingListResponse(bookings=bookings)


def serve():
    init_db()
    producer = make_producer()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(BookingService(producer), server)
    server.add_insecure_port(f"0.0.0.0:{GRPC_PORT}")
    server.start()
    print(f"[booking-service] gRPC server listening on :{GRPC_PORT}", flush=True)
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == "__main__":
    serve()
