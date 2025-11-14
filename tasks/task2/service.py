from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

from monolith_client import get_user, get_hotel, get_promo
from storage import save_booking, list_bookings
from kafka_producer import send_booking_event


class BookingOut(BaseModel):
    id: int
    user_id: str
    hotel_id: str
    promo_code: Optional[str]
    discount_percent: float
    price: float
    created_at: datetime

async def create_booking(user_id: str, hotel_id: str, promo_code: str | None) -> BookingOut:
    # 1. Check user (monolith provides details)
    user = await get_user(user_id)
    print(f'user: {user}\n')
    if user.get("blacklisted"):
        print("User is blacklisted")
        raise ValueError("User is blacklisted")

    # 2. Get hotel info
    hotel = await get_hotel(hotel_id)
    if hotel.get("rating") < 4.0:
        raise ValueError("Hotel rating is too low")

    print(f'hotel: {hotel}\n')
    if hotel.get("fullyBooked"):
        raise ValueError("Hotel is fully booked")

    base_price = float(hotel.get("price", 0))

    # 3. Promo
    promo = await get_promo(promo_code)
    discount = float(promo.get("discountPercent", 0))

    final_price = base_price * (1 - discount / 100)

    booking = await save_booking(user_id, hotel_id, promo_code, discount, final_price)
    await send_booking_event(booking)

    return BookingOut(
        id=booking.id,
        user_id=booking.user_id,
        hotel_id=booking.hotel_id,
        promo_code=booking.promo_code,
        discount_percent=booking.discount_percent,
        price=booking.price,
        created_at=booking.created_at
    )


async def get_bookings(user_id: str | None = None) -> List[BookingOut]:
    rows = await list_bookings(user_id)

    return [
        BookingOut(
            id=r.id,
            user_id=r.user_id,
            hotel_id=r.hotel_id,
            promo_code=r.promo_code or "",  # пустую строку вместо None
            discount_percent=r.discount_percent,
            price=r.price,
            created_at=r.created_at
        )
        for r in rows
    ]

