from pydantic import BaseModel

class ReadUserDto(BaseModel):
    active: bool
    blacklisted: bool
    city: str
    email: str
    id: str
    name: str
    status: str

class ReadHotelDto(BaseModel):
    id: str
    operational: bool
    fullyBooked: bool
    city: str
    rating: float
    description: str

class ReadPromoCodeDto(BaseModel):
    code: str
    discount: float
    vipOnly: bool
    expired: bool
    validUntil: str
    description: str

__all__ = [
    "ReadHotelDto",
    "ReadPromoCodeDto",
    "ReadUserDto",
]