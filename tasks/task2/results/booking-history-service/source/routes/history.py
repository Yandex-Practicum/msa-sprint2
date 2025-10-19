from typing import Annotated

from fastapi import APIRouter, Depends

from source.services import BookingHistoryService, get_booking_history_service

history_router = APIRouter()

@history_router.get("/user/{user_id}")
async def get_bookings_for_user(
    user_id: str,
    booking_service: Annotated[BookingHistoryService, Depends(get_booking_history_service)],
):
    return await booking_service.for_user(user_id)

__all__ = [
    "history_router",
]