from models import Booking
from db import SessionLocal
from datetime import datetime
import requests
import logging
from config import MONOLITH_BASE


logger = logging.getLogger("booking-service")

def create_booking(user_id, hotel_id, promo_code):

    user_resp = requests.get(f"{MONOLITH_BASE}/api/users/{user_id}")
    if user_resp.status_code != 200:
        raise Exception(f"User {user_id} not found")
    user = user_resp.json()
    logger.info("User data: %s", user)
    
    if not user.get("active") or user.get("blacklisted"):
        raise Exception("User is inactive or blacklisted")
    
    hotel_resp = requests.get(f"{MONOLITH_BASE}/api/hotels/{hotel_id}")
    if hotel_resp.status_code != 200:
        raise Exception(f"Hotel {hotel_id} not found")
    hotel = hotel_resp.json()
    logger.info("hotel data: %s", hotel)
    if not hotel.get("operational") or hotel.get("fullyBooked"):
        raise Exception("Hotel is not available")
    
    base_price = 80.0 if user.get("VIP") else 100.0
    
    discount = 0.0
    if promo_code:
        promo_resp = requests.post(
            f"{MONOLITH_BASE}/api/promocodes/validate",
            json={"user_id": user_id, "promo_code": promo_code}
        )
        if promo_resp.status_code == 200:
            promo = promo_resp.json()
            discount = promo.get("discount", 0.0)
        else:
            logger.warning("Promo code %s not valid for user %s", promo_code, user_id)

    final_price = base_price - discount

    booking = Booking(
        user_id=user_id,
        hotel_id=hotel_id,
        promo_code=promo_code,
        discount_percent=discount,
        price=final_price,
        created_at=datetime.utcnow()
    )
    session = SessionLocal()
    session.add(booking)
    session.commit()
    session.refresh(booking)
    session.close()
    
    return booking

def list_bookings(user_id=None):
    logger.info("Listing bookings")
    session = SessionLocal()
    query = session.query(Booking)
    if user_id:
        logger.info("Listing bookings for user %s", user_id)
        query = query.filter(Booking.user_id == user_id)
    bookings = query.all()
    session.close()
    return bookings
