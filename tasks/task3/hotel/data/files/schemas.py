from pydantic import BaseModel


class HotelSchema(BaseModel):
    id: str

    operational: bool
    fullyBooked: bool

    city: str
    rating: float

    description: str
