from datetime import datetime
from typing import Optional

from pydantic import BaseModel, computed_field


class CreateBookingIntentData(BaseModel):
    hotel_id: str
    promo_code: str
    user_id: str

class CreateBookingData(BaseModel):
    discount_percent: float
    hotel_id: str
    price: float
    promo_code: Optional[str]
    user_id: str

class ExistingBookingData(BaseModel):
    created_at: datetime
    discount_percent: float
    hotel_id: str
    id: str
    price: float
    promo_code: Optional[str]
    user_id: str

    @computed_field(alias="created_at")
    @property
    def created_at_iso8601(self) -> str:
        return self.created_at.strftime('%Y-%m-%dT%H:%M:%SZ')

__all__ = [
    "CreateBookingData",
    "CreateBookingIntentData",
    "ExistingBookingData",
]