import grpc
from concurrent import futures
import logging

from booking import list_bookings, create_booking
from kafka_producer import BookingProducer
from booking_pb2 import BookingResponse, BookingListResponse
import booking_pb2_grpc

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("BookingGRPCService")

class BookingServicer(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self):
        self.booking_producer = BookingProducer()

    def ListBookings(self, request, context):
        bookings = list_bookings(user_id=request.user_id)
        return BookingListResponse(
            bookings=[
                BookingResponse(
                    id=str(b.id),
                    user_id=b.user_id,
                    hotel_id=b.hotel_id,
                    promo_code=b.promo_code or "",
                    discount_percent=b.discount_percent or 0.0,
                    price=b.price,
                    created_at=b.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
                ) for b in bookings
            ]
        )

    def CreateBooking(self, request, context):
        logger.info("CreateBooking request received: user_id=%s, hotel_id=%s, promo_code=%s",
                    request.user_id, request.hotel_id, request.promo_code)
        try:
            booking = create_booking(request.user_id, request.hotel_id, request.promo_code)
            self.booking_producer.publish_booking_event(booking)
            logger.info("Booking created: id=%s", booking.id)
            return BookingResponse(
                id=str(booking.id),
                user_id=booking.user_id,
                hotel_id=booking.hotel_id,
                promo_code=booking.promo_code or "",
                discount_percent=booking.discount_percent or 0.0,
                price=booking.price,
                created_at=booking.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
            )
        except Exception as e:
            logger.exception("Error creating booking")
            context.set_details(str(e))
            context.set_code(grpc.StatusCode.INTERNAL)
            return BookingResponse()

def serve():
    logger.info("Starting gRPC server on port 9090")
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(BookingServicer(), server)
    server.add_insecure_port('[::]:9090')
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
