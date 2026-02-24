import os
import json
import uuid
from datetime import datetime, timezone
from concurrent import futures

import grpc
import psycopg2
from confluent_kafka import Producer

import booking_pb2
import booking_pb2_grpc


def iso_now():
    return datetime.now(timezone.utc).isoformat()


def discount_and_price(promo: str):
    promo = (promo or "").strip()
    if promo == "DISCOUNT10":
        return 10.0, 90.0
    return 0.0, 100.0


class Service(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self):
        self.dsn = os.environ["DB_DSN"]
        self.topic = os.environ.get("KAFKA_TOPIC", "booking.events")
        bootstrap = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
        self.producer = Producer({"bootstrap.servers": bootstrap})

    def _conn(self):
        return psycopg2.connect(self.dsn)

    def CreateBooking(self, request, context):
        user_id = (request.user_id or "").strip()
        hotel_id = (request.hotel_id or "").strip()
        promo_code = (request.promo_code or "").strip()

        if not user_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "user_id is required")
        if not hotel_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "hotel_id is required")

        discount, price = discount_and_price(promo_code)
        bid = str(uuid.uuid4())
        created_at = iso_now()

        conn = self._conn()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into bookings(id,user_id,hotel_id,promo_code,discount_percent,price,created_at)
                        values(%s,%s,%s,%s,%s,%s,%s::timestamptz)
                        """,
                        (bid, user_id, hotel_id, promo_code or None, discount, price, created_at),
                    )
        finally:
            conn.close()

        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "BOOKING_CREATED",
            "occurred_at": iso_now(),
            "booking": {
                "id": bid,
                "user_id": user_id,
                "hotel_id": hotel_id,
                "promo_code": promo_code,
                "discount_percent": discount,
                "price": price,
                "created_at": created_at,
            },
        }

        self.producer.produce(
            self.topic,
            key=bid.encode(),
            value=json.dumps(event, ensure_ascii=False).encode(),
        )
        self.producer.flush(5)

        return booking_pb2.BookingResponse(
            id=bid,
            user_id=user_id,
            hotel_id=hotel_id,
            promo_code=promo_code,
            discount_percent=discount,
            price=price,
            created_at=created_at,
        )

    def ListBookings(self, request, context):
        user_id = (request.user_id or "").strip()
        if not user_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "user_id is required")

        conn = self._conn()
        rows = []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select id,user_id,hotel_id,coalesce(promo_code,''),discount_percent,price,created_at
                    from bookings where user_id=%s order by created_at desc
                    """,
                    (user_id,),
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        out = []
        for bid, uid, hid, promo, disc, price, created_at in rows:
            out.append(
                booking_pb2.BookingResponse(
                    id=bid,
                    user_id=uid,
                    hotel_id=hid,
                    promo_code=promo,
                    discount_percent=float(disc),
                    price=float(price),
                    created_at=created_at.astimezone(timezone.utc).isoformat(),
                )
            )
        return booking_pb2.BookingListResponse(bookings=out)


def apply_migrations():
    conn = psycopg2.connect(os.environ["DB_DSN"])
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(open(os.path.join(os.path.dirname(__file__), "migrations.sql"), "r", encoding="utf-8").read())
    finally:
        conn.close()


def main():
    apply_migrations()

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(Service(), server)
    server.add_insecure_port("0.0.0.0:" + os.environ.get("GRPC_PORT", "9090"))
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    main()