import grpc
from concurrent import futures
import logging
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.booking_service import BookingService

# Импортируем сгенерированные gRPC модули
import proto.booking_pb2 as booking_pb2
import proto.booking_pb2_grpc as booking_pb2_grpc

logger = logging.getLogger(__name__)


class BookingGrpcServicer(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self):
        logger.info("gRPC Booking Service initialized")

    def CreateBooking(self, request, context):
        """gRPC метод для создания бронирования"""
        try:
            logger.info(
                f"gRPC CreateBooking: user_id={request.user_id}, hotel_id={request.hotel_id}")

            # Получаем сессию БД
            db: Session = next(get_db())
            service = BookingService(db)

            # Создаем бронирование
            booking = service.create_booking_sync(
                user_id=request.user_id,
                hotel_id=request.hotel_id,
                promo_code=request.promo_code if request.promo_code else None
            )

            if booking:
                return booking_pb2.BookingResponse(
                    id=booking.id,
                    user_id=booking.user_id,
                    hotel_id=booking.hotel_id,
                    promo_code=booking.promo_code or "",
                    discount_percent=booking.discount_percent,
                    price=booking.price,
                    created_at=booking.created_at
                )
            else:
                context.set_code(grpc.StatusCode.INTERNAL)
                context.set_details("Failed to create booking")
                return booking_pb2.BookingResponse()

        except Exception as e:
            logger.error(f"gRPC CreateBooking error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return booking_pb2.BookingResponse()

    def ListBookings(self, request, context):
        """gRPC метод для получения списка бронирований"""
        try:
            logger.info(f"gRPC ListBookings: user_id={request.user_id}")

            # Получаем сессию БД
            db: Session = next(get_db())
            service = BookingService(db)

            # Получаем бронирования
            if request.user_id:
                bookings_response = service.list_bookings_by_user_sync(
                    request.user_id)
            else:
                bookings_response = service.list_all_bookings_sync()

            # Конвертируем в gRPC response
            grpc_bookings = []
            for booking in bookings_response.bookings:
                grpc_booking = booking_pb2.BookingResponse(
                    id=booking.id,
                    user_id=booking.user_id,
                    hotel_id=booking.hotel_id,
                    promo_code=booking.promo_code or "",
                    discount_percent=booking.discount_percent,
                    price=booking.price,
                    created_at=booking.created_at
                )
                grpc_bookings.append(grpc_booking)

            return booking_pb2.BookingListResponse(bookings=grpc_bookings)

        except Exception as e:
            logger.error(f"gRPC ListBookings error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return booking_pb2.BookingListResponse()


def serve():
    """Запуск gRPC сервера"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(
        BookingGrpcServicer(), server)

    port = "9090"
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    logger.info(f"gRPC Server started on port {port}")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(0)
        logger.info("gRPC Server stopped")


if __name__ == '__main__':
    serve()