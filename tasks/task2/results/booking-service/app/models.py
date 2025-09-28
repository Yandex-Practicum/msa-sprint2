from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BookingBase(BaseModel):
    user_id: str
    hotel_id: str
    promo_code: Optional[str] = None

class BookingCreate(BookingBase):
    discount_percent: float = 0.0
    price: float

class BookingResponse(BookingBase):
    id: str
    discount_percent: float
    price: float
    created_at: str

    class Config:
        from_attributes = True

class BookingListResponse(BaseModel):
    bookings: List[BookingResponse]