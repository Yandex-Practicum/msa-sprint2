class InvalidUserException(ValueError):
    pass

class InvalidHotelException(ValueError):
    pass

__all__ = [
    "InvalidUserException",
    "InvalidHotelException",
]