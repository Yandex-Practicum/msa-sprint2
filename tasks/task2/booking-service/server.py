import asyncio
import datetime
import json
import logging
import grpc
from grpc import aio
from aiokafka import AIOKafkaProducer
from sqlalchemy.future import select

import booking_pb2
import booking_pb2_grpc
from database import init_db, async_session, BookingModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BookingService(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self):
        self.kafka_host = 'localhost:9092'
        self.producer = None

    async def start_kafka(self):
        """Initialize and start the asynchronous Kafka Producer."""
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.kafka_host, value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await self.producer.start()
        logger.info('Kafka Producer started successfully.')

    async def stop_kafka(self):
        """Stop the Kafka Producer gracefully."""
        if self.producer:
            await self.producer.stop()
            logger.info('Kafka Producer stopped.')

    def _to_proto_booking(self, b: BookingModel) -> booking_pb2.BookingResponse:
        """Safely parses and converts database types into strict Protobuf types."""
        # Clean datetime serialization
        if isinstance(b.created_at, datetime.datetime):
            created_str = b.created_at.isoformat() + 'Z'
        elif isinstance(b.created_at, str):
            created_str = b.created_at if b.created_at.endswith('Z') else b.created_at + 'Z'
        else:
            created_str = str(b.created_at or '')

        return booking_pb2.BookingResponse(
            id=str(b.id),
            user_id=str(b.user_id),
            hotel_id=str(b.hotel_id),
            promo_code=str(b.promo_code or ''),
            discount_percent=float(b.discount_percent or 0.0),
            price=float(b.price or 0.0),
            created_at=created_str,
        )

    async def CreateBooking(
        self, request: booking_pb2.BookingRequest, context: grpc.aio.ServicerContext
    ) -> booking_pb2.BookingResponse:
        logger.info(f'Received CreateBooking request for user: {request.user_id}')

        discount = 10.0 if request.promo_code else 0.0
        base_price = 5000.0
        final_price = base_price * (1 - discount / 100)

        now = datetime.datetime.utcnow()
        created_at_iso = now.isoformat() + 'Z'

        async with async_session() as session:
            async with session.begin():
                new_booking = BookingModel(
                    user_id=request.user_id,
                    hotel_id=request.hotel_id,
                    promo_code=request.promo_code if request.promo_code else None,
                    discount_percent=discount,
                    price=final_price,
                    created_at=now,
                )
                session.add(new_booking)
                await session.flush()

                proto_response = self._to_proto_booking(new_booking)

        kafka_event = {
            'event': 'BOOKING_CREATED',
            'id': proto_response.id,
            'user_id': request.user_id,
            'hotel_id': request.hotel_id,
            'promo_code': request.promo_code,
            'discount_percent': discount,
            'price': final_price,
            'created_at': created_at_iso,
        }

        try:
            await self.producer.send_and_wait('booking-events', kafka_event)
            logger.info(f'Booking event {proto_response.id} successfully sent to Kafka.')
        except Exception as e:
            logger.error(f'Failed to send event to Kafka: {e}')

        return proto_response

    async def ListBookings(
        self, request: booking_pb2.BookingListRequest, context: grpc.aio.ServicerContext
    ) -> booking_pb2.BookingListResponse:
        logger.info(f'Received ListBookings request for user: {request.user_id}')

        async with async_session() as session:
            result = await session.execute(select(BookingModel).where(BookingModel.user_id == request.user_id))
            db_bookings = result.scalars().all()

        grpc_bookings = [self._to_proto_booking(b) for b in db_bookings]

        return booking_pb2.BookingListResponse(bookings=grpc_bookings)


async def serve():
    await init_db()
    server = aio.server()

    booking_service_impl = BookingService()
    await booking_service_impl.start_kafka()

    booking_pb2_grpc.add_BookingServiceServicer_to_server(booking_service_impl, server)

    server.add_insecure_port('[::]:9090')
    logger.info('Async gRPC server listening on port 9090...')

    await server.start()

    try:
        await server.wait_for_termination()
    finally:
        await server.stop(5)
        await booking_service_impl.stop_kafka()


if __name__ == '__main__':
    asyncio.run(serve())
