from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CreateBookingHistoryRecordSchema(BaseModel):
    user_id: str
    hotel_id: str
    promo_code: Optional[str]
    discount_percent: Optional[float]
    price: float
    reason: str
    created: bool
    created_at: datetime


class BookingHistoryRecordSchema(BaseModel):
    id: int
