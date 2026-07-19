import asyncio
import datetime
import json
import logging
import os

import booking_pb2
import booking_pb2_grpc
import grpc
import httpx
from aiokafka import AIOKafkaProducer
from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from aiokafka.errors import TopicAlreadyExistsError
from database import BookingModel, KafkaOutbox, async_session, init_db
from grpc import aio
from sqlalchemy.future import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BookingService(booking_pb2_grpc.BookingServiceServicer):
    TOPIC_BOOKING_EVENTS = 'booking-events'

    def __init__(self):
        self.kafka_host = 'localhost:9092'
        self.monolith_base_url = os.getenv('MONOLITH_BASE_URL', 'http://localhost:8084')
        self.producer = None
        self.outbox_task = None
        self.is_running = False
        self.http_client = httpx.AsyncClient(base_url=self.monolith_base_url, timeout=5.0, trust_env=False)

    async def start_kafka(self):
        """Initialize Admin Client to auto-create topics, then start Producer."""
        self.is_running = True

        admin_client = AIOKafkaAdminClient(bootstrap_servers=self.kafka_host)
        await admin_client.start()
        try:
            topic_list = [NewTopic(name=self.TOPIC_BOOKING_EVENTS, num_partitions=3, replication_factor=1)]
            await admin_client.create_topics(new_topics=topic_list, validate_only=False)
            logger.info(f"Topic '{self.TOPIC_BOOKING_EVENTS}' validated/created successfully.")
        except TopicAlreadyExistsError:
            logger.info(f"Topic '{self.TOPIC_BOOKING_EVENTS}' already exists.")
        except Exception as e:
            logger.error(f'Failed to verify/create Kafka topics: {e}')
        finally:
            await admin_client.close()

        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.kafka_host, value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await self.producer.start()
        logger.info('Kafka Producer started successfully.')

        self.outbox_task = asyncio.create_task(self._outbox_relay_worker())

    async def stop_kafka(self):
        """Stop worker, HTTP client, and producers gracefully."""
        self.is_running = False
        if self.outbox_task:
            self.outbox_task.cancel()
            try:
                await self.outbox_task
            except asyncio.CancelledError:
                pass
        if self.producer:
            await self.producer.stop()
            logger.info('Kafka Producer stopped.')

        await self.http_client.aclose()
        logger.info('HTTP Client closed.')

    def _to_proto_booking(self, b: BookingModel) -> booking_pb2.BookingResponse:
        """Safely parses and converts database types into strict Protobuf types."""
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

    async def _validate_user_via_monolith(self, user_id: str, context: grpc.aio.ServicerContext):
        """Performs async HTTP queries to validate the user state against the monolith."""
        try:
            active_res, blacklisted_res = await asyncio.gather(
                self.http_client.get(f'/api/users/{user_id}/active'),
                self.http_client.get(f'/api/users/{user_id}/blacklisted'),
            )

            active_res.raise_for_status()
            blacklisted_res.raise_for_status()

            is_active = active_res.json()
            is_blacklisted = blacklisted_res.json()

            if not is_active:
                logger.warn(f'User {user_id} is inactive via monolith validation.')
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, 'User is inactive')

            if is_blacklisted:
                logger.warn(f'User {user_id} is blacklisted via monolith validation.')
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, 'User is blacklisted')

        except httpx.HTTPStatusError as http_err:
            logger.error(f'Monolith returned error status during validation: {http_err}')
            await context.abort(grpc.StatusCode.UNAVAILABLE, 'User validation service returned error status')
        except httpx.RequestError as req_err:
            logger.error(f'Network error trying to reach monolith user endpoints: {req_err}')
            await context.abort(grpc.StatusCode.UNAVAILABLE, 'User validation backend is unreachable')

    async def _validate_hotel_via_monolith(self, hotel_id: str, context: grpc.aio.ServicerContext):
        """Performs async HTTP queries to validate the hotel state against the monolith."""
        try:
            operational_res, trusted_res, booked_res = await asyncio.gather(
                self.http_client.get(f'/api/hotels/{hotel_id}/operational'),
                self.http_client.get(f'/api/reviews/hotel/{hotel_id}/trusted'),
                self.http_client.get(f'/api/hotels/{hotel_id}/fully-booked'),
            )

            operational_res.raise_for_status()
            trusted_res.raise_for_status()
            booked_res.raise_for_status()

            if not operational_res.json():
                logger.warn(f'Hotel {hotel_id} is not operational.')
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, 'Hotel is not operational')

            if not trusted_res.json():
                logger.warn(f'Hotel {hotel_id} is not trusted based on reviews.')
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, 'Hotel is not trusted based on reviews')

            if booked_res.json():
                logger.warn(f'Hotel {hotel_id} is fully booked.')
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, 'Hotel is fully booked')

        except httpx.HTTPStatusError as http_err:
            logger.error(f'Monolith hotel endpoints returned error status: {http_err}')
            await context.abort(grpc.StatusCode.UNAVAILABLE, 'Hotel validation backend error')
        except httpx.RequestError as req_err:
            logger.error(f'Network error reaching monolith hotel endpoints: {req_err}')
            await context.abort(grpc.StatusCode.UNAVAILABLE, 'Hotel validation backend unreachable')

    async def CreateBooking(
        self, request: booking_pb2.BookingRequest, context: grpc.aio.ServicerContext
    ) -> booking_pb2.BookingResponse:
        logger.info(f'Received CreateBooking request for user: {request.user_id}')

        await asyncio.gather(
            self._validate_user_via_monolith(request.user_id, context),
            self._validate_hotel_via_monolith(request.hotel_id, context)
        )

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

                outbox_entry = KafkaOutbox(
                    id=proto_response.id, topic=self.TOPIC_BOOKING_EVENTS, payload=json.dumps(kafka_event)
                )
                session.add(outbox_entry)

                logger.info(f'Booking {proto_response.id} and outbox entry successfully staged in DB.')

        return proto_response

    async def _outbox_relay_worker(self):
        """Background loop looking for pending messages to forward to Kafka."""
        while self.is_running:
            try:
                async with async_session() as session:
                    stmt = (
                        select(KafkaOutbox)
                        .where(KafkaOutbox.processed.is_(False))
                        .limit(10)
                        .with_for_update(skip_locked=True)
                    )
                    result = await session.execute(stmt)
                    pending_events = result.scalars().all()

                    if not pending_events:
                        await asyncio.sleep(1)
                        continue

                    for event in pending_events:
                        try:
                            payload_dict = json.loads(event.payload)
                            await self.producer.send_and_wait(event.topic, payload_dict)

                            event.processed = True
                            logger.info(f'Outbox successfully relayed event {event.id} to topic {event.topic}.')
                        except Exception as kafka_err:
                            logger.error(f'Failed to relay outbox event {event.id}: {kafka_err}')

                    await session.commit()
            except Exception as loop_err:
                logger.error(f'Error inside Outbox Relay Loop: {loop_err}')
                await asyncio.sleep(2)

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
