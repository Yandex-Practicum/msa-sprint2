from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CreateBookingSchema(BaseModel):
    user_id: str
    hotel_id: str
    promo_code: Optional[str]
    discount_percent: Optional[float]
    price: float


class BookingSchema(CreateBookingSchema):
    id: int
    created_at: datetime
