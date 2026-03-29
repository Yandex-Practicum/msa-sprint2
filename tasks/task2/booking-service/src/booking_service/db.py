from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import psycopg2
from psycopg2.extensions import connection as PgConnection

from booking_service.config import DATABASE_URL

log = logging.getLogger(__name__)


@dataclass
class BookingRow:
    id: int
    user_id: str
    hotel_id: str
    promo_code: str | None
    discount_percent: float
    price: float
    created_at: datetime


def connect() -> PgConnection:
    return psycopg2.connect(DATABASE_URL)


def init_schema(conn: PgConnection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS booking (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                hotel_id VARCHAR(255) NOT NULL,
                promo_code VARCHAR(255),
                discount_percent DOUBLE PRECISION NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
    conn.commit()
    log.info("booking schema ensured")


def insert_booking(
    conn: PgConnection,
    user_id: str,
    hotel_id: str,
    promo_code: str | None,
    discount_percent: float,
    price: float,
) -> BookingRow:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, hotel_id, promo_code, discount_percent, price, created_at;
            """,
            (user_id, hotel_id, promo_code, discount_percent, price),
        )
        row = cur.fetchone()
    conn.commit()
    assert row is not None
    return BookingRow(
        id=row[0],
        user_id=row[1],
        hotel_id=row[2],
        promo_code=row[3],
        discount_percent=float(row[4]),
        price=float(row[5]),
        created_at=row[6],
    )


def list_bookings(conn: PgConnection, user_id: str | None) -> list[BookingRow]:
    q = """
        SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at
        FROM booking
    """
    params: tuple[Any, ...] = ()
    if user_id:
        q += " WHERE user_id = %s"
        params = (user_id,)
    q += " ORDER BY id ASC"
    with conn.cursor() as cur:
        cur.execute(q, params)
        rows = cur.fetchall()
    return [
        BookingRow(
            id=r[0],
            user_id=r[1],
            hotel_id=r[2],
            promo_code=r[3],
            discount_percent=float(r[4]),
            price=float(r[5]),
            created_at=r[6],
        )
        for r in rows
    ]
