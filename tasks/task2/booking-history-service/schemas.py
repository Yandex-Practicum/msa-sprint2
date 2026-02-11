from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BookingHistorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: str
    user_id: str
    hotel_id: str
    promo_code: Optional[str] = None
    discount_pct: float
    price: float
    created_at: Optional[str] = None
    received_at: datetime
