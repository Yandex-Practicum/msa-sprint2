from typing import List, Optional
from app.grpc_client import GrpcBookingClient
from app.models import BookingResponse, BookingListResponse


class BookingService:
    def __init__(self):
        self.grpc_client = GrpcBookingClient(
            host='monolith',
            port=9090
        )

    async def create_booking(self, user_id: str, hotel_id: str,
                             promo_code: Optional[str] = None) -> Optional[
        BookingResponse]:
        booking_data = self.grpc_client.create_booking(user_id, hotel_id,
                                                       promo_code)

        if booking_data:
            return BookingResponse(**booking_data)
        return None

    async def list_bookings(self, user_id: str) -> BookingListResponse:
        bookings_data = self.grpc_client.list_bookings(user_id)
        bookings = [BookingResponse(**booking) for booking in bookings_data]
        return BookingListResponse(bookings=bookings)

    def shutdown(self):
        self.grpc_client.close()