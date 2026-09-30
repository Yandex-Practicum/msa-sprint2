from connections import get_pool
from logger import log


def handle_booking_created(event: dict) -> None:
    """Обработка одного события. Отправка письма/пуша пользователю о созданной брони."""
    booking_id = event.get("id")
    user_id = event.get("userId")
    hotel_id = event.get("hotelId")
    promo_code = event.get("promoCode")
    discount = event.get("discountPercent")
    price = event.get("price")
    created_at = event.get("createdAt")

    _insert_booking(booking_id, user_id, hotel_id, promo_code, discount, price, created_at)

    if not booking_id or not user_id:
        log.warning("Malformed event, skipping: %r", event)
        return

    log.info(
        "Booking History: booking %s created for user %s at hotel %s, price=%.2f (at %s)",
        booking_id, user_id, hotel_id, price or 0.0, created_at,
    )


def _insert_booking(booking_id, user_id, hotel_id, promo_code, discount, price, created_at):
    pool = get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO booking_history
                    (
                    booking_id,
                    user_id,
                    hotel_id,
                    promo_code,
                    discount_percent,
                    price,
                    created_at
                    )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (booking_id, user_id, hotel_id, promo_code, discount, price, created_at),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        log.exception("DB insert failed")
    finally:
        pool.putconn(conn)
