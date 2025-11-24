from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from app.config import DB_URL
from app.logger import logger
from app.models import BookingHistory

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)


def save_booking_to_db(data):
    session = SessionLocal()
    booking = BookingHistory(
        id=data["id"],
        user_id=data["user_id"],
        hotel_id=data["hotel_id"],
        promo_code=data.get("promo_code", ""),
        discount_percent=data.get("discount_percent", 0.0),
        price=data["price"],
        created_at=data.get("created_at")
    )

    try:
        session.add(booking)
        session.commit()
        logger.info("Saved booking %s", booking.id)
    except IntegrityError:
        session.rollback()
        logger.warning("Booking %s already exists", booking.id)
    except Exception as e:
        session.rollback()
        logger.exception("Error saving booking %s: %s", booking.id, e)
    finally:
        session.close()
