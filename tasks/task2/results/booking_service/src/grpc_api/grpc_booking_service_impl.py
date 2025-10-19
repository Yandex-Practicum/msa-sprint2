import logging
from contextvars import ContextVar
from typing import Annotated, List

import grpc
from fastapi import Depends

import booking_pb2
import booking_pb2_grpc
from src.decorators import auto_di
from src.dto import ExistingBookingData
from src.dto.internal import CreateBookingIntentData
from src.services import BookingService, get_booking_service

logger = logging.getLogger(__name__)

class GrpcBookingService(booking_pb2_grpc.BookingServiceServicer):
    def __init__(self):
        self._req_ctx = ContextVar("request_context")

    async def CreateBooking(
        self,
        request: booking_pb2.BookingRequest,
        context: grpc.aio.ServicerContext,
    ) -> booking_pb2.BookingResponse:
        token = None

        try:
            token = self._req_ctx.set(request)

            new_booking: ExistingBookingData = await self._create_booking()

            return booking_pb2.BookingResponse(
                id=new_booking.id,
                user_id=new_booking.user_id,
                hotel_id=new_booking.hotel_id,
                promo_code=new_booking.promo_code,
                discount_percent=new_booking.discount_percent,
                price=new_booking.price,
                created_at=new_booking.created_at_iso8601,
            )
        except Exception as err:
            logger.exception(f"Failed to create a booking: {str(err)}")
            raise err
        finally:
            self._req_ctx.reset(token)

    @auto_di
    async def _create_booking(
        self,
        booking_service: Annotated[BookingService, Depends(get_booking_service)],
    ) -> ExistingBookingData:
        req_ctx: booking_pb2.BookingRequest = self._req_ctx.get()

        create_booking_data = CreateBookingIntentData(
            user_id=req_ctx.user_id,
            hotel_id=req_ctx.hotel_id,
            promo_code=req_ctx.promo_code,
        )

        new_booking = await booking_service.create(create_booking_data)

        return new_booking

    @auto_di
    async def _fetch_bookings(
        self,
        booking_service: Annotated[BookingService, Depends(get_booking_service)],
    ) -> List[ExistingBookingData]:
        req_ctx: booking_pb2.BookingListRequest = self._req_ctx.get()
        user_id: str = req_ctx.user_id

        return await booking_service.fetch_for_user(user_id)

    async def ListBookings(
        self,
        request: booking_pb2.BookingListRequest,
        context: grpc.aio.ServicerContext,
    ) -> booking_pb2.BookingListResponse:
        try:
            token = self._req_ctx.set(request)
            found_reservations: List[ExistingBookingData] = await self._fetch_bookings()

            return booking_pb2.BookingListResponse(
                bookings=[
                    booking_pb2.BookingResponse(
                        created_at=cur_rsv.created_at_iso8601,
                        discount_percent=cur_rsv.discount_percent,
                        hotel_id=cur_rsv.hotel_id,
                        id=cur_rsv.id,
                        price=cur_rsv.price,
                        promo_code=cur_rsv.promo_code,
                        user_id=cur_rsv.user_id,
                    )
                    for cur_rsv in found_reservations
                ],
            )
        except Exception as err:
            logger.exception(f"Failed to fetch a list of reservations: {str(err)}")
            raise err
        finally:
            self._req_ctx.reset(token)

__all__ = [
    "GrpcBookingService",
]