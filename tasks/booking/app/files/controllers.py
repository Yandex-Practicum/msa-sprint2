import grpc
from app.files.proto import booking_pb2, booking_pb2_grpc
from app.files.services import BookingServices, booking_services

from tasks.booking.app.files.proto import booking_pb2, booking_pb2_grpc


class BookingConntroller(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self, booking_services: BookingServices):
        super().__init__()

        self.booking_services = booking_services

    async def ListBookings(self, request, context):
        """Handles ListBookings RPC call."""
        booking_list_dto = await self.booking_services.list_bookings(
            user_id=request.user_id
        )

        response = booking_pb2.BookingListResponse()

        for booking in booking_list_dto:
            response.bookings.append(
                booking_pb2.BookingResponse(
                    id=booking.id,
                    user_id=booking.user_id,
                    hotel_id=booking.hotel_id,
                    promo_code=booking.promo_code,
                    discount_percent=booking.discount_percent,
                    price=booking.price,
                    created_at=booking.created_at,
                )
            )

        return response

    async def CreateBooking(self, request, context):
        booking_dto = await self.booking_services.create_booking(
            hotel_id=request.hotel_id,
            promo_code=request.promo_code,
            user_id=request.user_id,
        )

        response = booking_pb2.BookingResponse(
            id=booking_dto.id,
            user_id=booking_dto.user_id,
            hotel_id=booking_dto.hotel_id,
            promo_code=booking_dto.promo_code,
            discount_percent=booking_dto.discount_percent,
            price=booking_dto.price,
            created_at=booking_dto.created_at,
        )

        return response


booking_controller = BookingConntroller(booking_services=booking_services)
