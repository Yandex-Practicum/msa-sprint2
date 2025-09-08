from pydantic import BaseModel

class NewBookingDto(BaseModel):
    created_at: str
    discount_percent: float
    hotel_id: str
    id: str
    price: float
    promo_code: str | None
    user_id: str

__all__ = [
    "NewBookingDto",
]