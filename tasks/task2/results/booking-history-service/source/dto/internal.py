import uuid
from typing import Optional

from pydantic import BaseModel


class CreateBookingHistoryRecordDto(BaseModel):
    booked_at: str
    booking_id: str
    discount_percent: float
    hotel_id: str
    price: float
    promo_code: Optional[str]
    user_id: str

class ExistingBookingHistoryRecordDto(BaseModel):
    booked_at: str
    booking_id: str
    discount_percent: float
    hotel_id: str
    id: uuid.UUID
    price: float
    promo_code: Optional[str]
    user_id: str

__all__ = [
    "CreateBookingHistoryRecordDto",
    "ExistingBookingHistoryRecordDto",
]