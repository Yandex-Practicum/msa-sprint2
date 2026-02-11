import grpc
import logging
import requests
from concurrent import futures
from datetime import timezone

import booking_pb2
import booking_pb2_grpc
from grpc_reflection.v1alpha import reflection

from sqlalchemy import select

from config import settings
from database import SessionLocal, init_db
from models import Booking
from kafka_producer import publish

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger(__name__)


# REST клиент монолита


def _get(path: str) -> str:
    try:
        r = requests.get(f"{settings.monolith_url}{path}", timeout=5)
        return r.text.strip()
    except Exception as e:
        logger.error("GET %s failed: %s", path, e)
        return ""


def _post_json(path: str, params=None):
    try:
        r = requests.post(f"{settings.monolith_url}{path}", params=params, timeout=5)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        logger.error("POST %s failed: %s", path, e)
        return None


def is_user_active(user_id: str) -> bool:
    return _get(f"/api/users/{user_id}/active").lower() == "true"


def is_user_blacklisted(user_id: str) -> bool:
    return _get(f"/api/users/{user_id}/blacklisted").lower() == "true"


def get_user_status(user_id: str) -> str:
    return _get(f"/api/users/{user_id}/status").strip('"')


def is_hotel_operational(hotel_id: str) -> bool:
    return _get(f"/api/hotels/{hotel_id}/operational").lower() == "true"


def is_hotel_fully_booked(hotel_id: str) -> bool:
    return _get(f"/api/hotels/{hotel_id}/fully-booked").lower() == "true"


def is_hotel_trusted(hotel_id: str) -> bool:
    return _get(f"/api/reviews/hotel/{hotel_id}/trusted").lower() == "true"


def validate_promo(promo_code: str, user_id: str):
    return _post_json("/api/promos/validate", params={"code": promo_code, "userId": user_id})


# gRPC сервис


class BookingServiceServicer(booking_pb2_grpc.BookingServiceServicer):

    def CreateBooking(self, request, context):
        user_id = request.user_id
        hotel_id = request.hotel_id
        promo_code = request.promo_code.strip() or None

        logger.info("CreateBooking: userId=%s, hotelId=%s, promoCode=%s", user_id, hotel_id, promo_code)

        if not is_user_active(user_id):
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "User is inactive")
        if is_user_blacklisted(user_id):
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "User is blacklisted")
        if not is_hotel_operational(hotel_id):
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "Hotel is not operational")
        if not is_hotel_trusted(hotel_id):
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "Hotel is not trusted based on reviews")
        if is_hotel_fully_booked(hotel_id):
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "Hotel is fully booked")

        status = get_user_status(user_id)
        base_price = 80.0 if status.upper() == "VIP" else 100.0

        discount = 0.0
        if promo_code:
            promo = validate_promo(promo_code, user_id)
            if promo:
                discount = float(promo.get("discount", 0.0))

        final_price = base_price - discount

        with SessionLocal() as session:
            booking = Booking(
                user_id=user_id,
                hotel_id=hotel_id,
                promo_code=promo_code,
                discount_percent=discount,
                price=final_price,
            )
            session.add(booking)
            session.commit()
            session.refresh(booking)
            booking_id = booking.id
            created_at = booking.created_at

        created_at_str = created_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

        publish(
            {
                "id": str(booking_id),
                "userId": user_id,
                "hotelId": hotel_id,
                "promoCode": promo_code,
                "discountPercent": discount,
                "price": final_price,
                "createdAt": created_at_str,
            }
        )

        return booking_pb2.BookingResponse(
            id=str(booking_id),
            user_id=user_id,
            hotel_id=hotel_id,
            promo_code=promo_code or "",
            discount_percent=discount,
            price=final_price,
            created_at=created_at_str,
        )

    def ListBookings(self, request, context):
        user_id = request.user_id

        with SessionLocal() as session:
            q = select(Booking).order_by(Booking.created_at.desc())
            if user_id:
                q = q.where(Booking.user_id == user_id)
            rows = session.scalars(q).all()

        bookings = [
            booking_pb2.BookingResponse(
                id=str(row.id),
                user_id=row.user_id,
                hotel_id=row.hotel_id,
                promo_code=row.promo_code or "",
                discount_percent=row.discount_percent or 0.0,
                price=row.price,
                created_at=row.created_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            )
            for row in rows
        ]

        return booking_pb2.BookingListResponse(bookings=bookings)


# Точка входа


def serve() -> None:
    init_db()

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(BookingServiceServicer(), server)
    reflection.enable_server_reflection(
        [booking_pb2.DESCRIPTOR.services_by_name["BookingService"].full_name, reflection.SERVICE_NAME],
        server,
    )
    server.add_insecure_port(f"[::]:{settings.grpc_port}")
    server.start()
    logger.info("gRPC BookingService started on port %d", settings.grpc_port)
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
