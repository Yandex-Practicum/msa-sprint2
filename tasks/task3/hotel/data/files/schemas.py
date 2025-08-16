from pydantic import BaseModel


class HotelSchema(BaseModel):
    id: int

    operational: bool
    fullyBooked: bool

    city: str
    rating: float

    description: str
