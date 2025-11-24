from models import Booking
from db import SessionLocal
from datetime import datetime
import requests
import logging
from config import MONOLITH_HOST

logger = logging.getLogger("booking-service")

def get_user_data(user_id):
    user_response = requests.get(f"{MONOLITH_HOST}/api/users/{user_id}")
    if user_response.status_code != 200:
        raise Exception(f"User {user_id} not found")
    return user_response.json()

def get_hotel_data(hotel_id):
    hotel_response = requests.get(f"{MONOLITH_HOST}/api/hotels/{hotel_id}")
    if hotel_response.status_code != 200:
        raise Exception(f"Hotel {hotel_id} not found")
    return hotel_response.json()

def validate_promo_code(user_id, promo_code):
    promo_response = requests.post(
        f"{MONOLITH_HOST}/api/promocodes/validate",
        json={"user_id": user_id, "promo_code": promo_code}
    )
    if promo_response.status_code == 200:
        return promo_response.json().get("discount", 0.0)
    else:
        logger.warning("Promo code %s is invalid or not applicable for user %s", promo_code, user_id)
        return 0.0

def create_booking(user_id, hotel_id, promo_code):
    user_data = get_user_data(user_id)
    logger.info("User data: %s", user_data)

    if not user_data.get("active") or user_data.get("blacklisted"):
        raise Exception("User is inactive or blacklisted")

    hotel_data = get_hotel_data(hotel_id)
    logger.info("Hotel data: %s", hotel_data)

    if not hotel_data.get("operational") or hotel_data.get("fullyBooked"):
        raise Exception("Hotel is not available")

    base_price = 80.0 if user_data.get("VIP") else 100.0
    discount_percent = validate_promo_code(user_id, promo_code)
    final_price = base_price - (base_price * discount_percent)

    booking = Booking(
        user_id=user_id,
        hotel_id=hotel_id,
        promo_code=promo_code,
        discount_percent=discount_percent,
        price=final_price,
        created_at=datetime.utcnow()
    )

    with SessionLocal() as session:
        session.add(booking)
        session.commit()
        session.refresh(booking)

    return booking

def list_bookings(user_id=None):
    logger.info("Listing bookings")
    with SessionLocal() as session:
        query = session.query(Booking)
        if user_id:
            logger.info("Listing bookings for user %s", user_id)
            query = query.filter(Booking.user_id == user_id)
        bookings = query.all()
    return bookings
