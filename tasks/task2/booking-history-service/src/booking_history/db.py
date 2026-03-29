import json
import logging
from datetime import datetime
from typing import Any

import psycopg2
from psycopg2.extras import Json

from booking_history.config import DATABASE_URL

log = logging.getLogger(__name__)


def connect():
    return psycopg2.connect(DATABASE_URL)


def init_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS booking_history (
                id SERIAL PRIMARY KEY,
                booking_id BIGINT NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                hotel_id VARCHAR(255) NOT NULL,
                promo_code VARCHAR(255),
                discount_percent DOUBLE PRECISION,
                price DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                event_day DATE NOT NULL,
                raw_payload JSONB
            );
            """
        )
    conn.commit()


def insert_event(conn, payload: dict[str, Any]) -> None:
    created = payload.get("createdAt")
    if isinstance(created, str):
        created_at = datetime.fromisoformat(created.replace("Z", "+00:00"))
    else:
        created_at = datetime.now().astimezone()
    day = created_at.date()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO booking_history (
                booking_id, user_id, hotel_id, promo_code,
                discount_percent, price, created_at, event_day, raw_payload
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
            """,
            (
                int(payload["bookingId"]),
                payload["userId"],
                payload["hotelId"],
                payload.get("promoCode"),
                float(payload.get("discountPercent") or 0),
                float(payload["price"]),
                created_at,
                day,
                Json(payload),
            ),
        )
    conn.commit()
