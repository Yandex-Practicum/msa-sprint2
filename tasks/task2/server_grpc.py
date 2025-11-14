import asyncio
from datetime import timezone

import grpc
import booking_pb2
import booking_pb2_grpc

from service import create_booking, get_bookings
from storage import init_models


class BookingGrpcService(booking_pb2_grpc.BookingServiceServicer):

    async def CreateBooking(self, request, context):
        result = await create_booking(
            request.user_id,
            request.hotel_id,
            request.promo_code or None
        )

        return booking_pb2.BookingResponse(
            id=str(result.id),
            user_id=result.user_id,
            hotel_id=result.hotel_id,
            promo_code=result.promo_code or "",
            discount_percent=result.discount_percent,
            price=result.price,
            created_at=result.created_at.replace(tzinfo=timezone.utc).isoformat(),
        )

    async def ListBookings(self, request, context):
        # Если user_id пустой или None, передаем None
        user_id = request.user_id if request.user_id else None
        print('ListBookings.get_bookings...')
        rows = await get_bookings(user_id)

        return booking_pb2.BookingListResponse(
            bookings=[
                booking_pb2.BookingResponse(
                    id=str(r.id),
                    user_id=r.user_id,
                    hotel_id=r.hotel_id,
                    promo_code=r.promo_code or "",
                    discount_percent=r.discount_percent,
                    price=r.price,
                    created_at=r.created_at.replace(tzinfo=timezone.utc).isoformat(),
                )
                for r in rows
            ]
        )



async def serve():
    await init_models()  # подключаем БД до запуска gRPC

    server = grpc.aio.server()
    booking_pb2_grpc.add_BookingServiceServicer_to_server(BookingGrpcService(), server)
    server.add_insecure_port("[::]:50051")

    print("🚀 gRPC Booking-service started on :50051")
    await server.start()
    await server.wait_for_termination()


if __name__ == "__main__":
    asyncio.run(serve())
