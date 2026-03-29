from __future__ import annotations

import logging
from datetime import timezone

import grpc
import httpx

from booking_service import booking_pb2, booking_pb2_grpc
from booking_service.db import connect, insert_booking, list_bookings
from booking_service.kafka_out import BookingEventProducer
from booking_service.monolith_client import MonolithClient, MonolithClientError

log = logging.getLogger(__name__)


def _iso(dt) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


class BookingGrpcServicer(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self, monolith: MonolithClient, producer: BookingEventProducer) -> None:
        self._monolith = monolith
        self._producer = producer

    def CreateBooking(self, request, context):  # type: ignore[no-untyped-def]
        promo = request.promo_code or None
        if promo == "":
            promo = None
        try:
            discount, price = self._monolith.validate_and_compute(
                request.user_id, request.hotel_id, promo
            )
        except MonolithClientError as e:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(e))
        except httpx.HTTPError as e:
            log.warning("monolith HTTP error: %s", e)
            context.abort(grpc.StatusCode.UNAVAILABLE, "monolith unavailable")

        conn = connect()
        try:
            row = insert_booking(
                conn,
                request.user_id,
                request.hotel_id,
                promo,
                discount,
                price,
            )
        finally:
            conn.close()

        try:
            self._producer.publish_created(
                row.id,
                row.user_id,
                row.hotel_id,
                row.promo_code,
                row.discount_percent,
                row.price,
                row.created_at,
            )
        except Exception:
            log.exception("failed to publish kafka event for booking %s", row.id)

        return booking_pb2.BookingResponse(
            id=str(row.id),
            user_id=row.user_id,
            hotel_id=row.hotel_id,
            promo_code=row.promo_code or "",
            discount_percent=row.discount_percent,
            price=row.price,
            created_at=_iso(row.created_at),
        )

    def ListBookings(self, request, context):  # type: ignore[no-untyped-def]
        uid = (request.user_id or "").strip() or None
        conn = connect()
        try:
            rows = list_bookings(conn, uid)
        finally:
            conn.close()
        return booking_pb2.BookingListResponse(
            bookings=[
                booking_pb2.BookingResponse(
                    id=str(r.id),
                    user_id=r.user_id,
                    hotel_id=r.hotel_id,
                    promo_code=r.promo_code or "",
                    discount_percent=r.discount_percent,
                    price=r.price,
                    created_at=_iso(r.created_at),
                )
                for r in rows
            ]
        )
