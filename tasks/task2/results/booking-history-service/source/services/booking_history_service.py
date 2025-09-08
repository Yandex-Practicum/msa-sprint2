import logging
from typing import Annotated, List

from fastapi import Depends

import source.database.models as db
from source.database.repositories import BookingHistoryRepository, get_booking_history_repository
from source.dto import CreateBookingHistoryRecordDto, ExistingBookingHistoryRecordDto
from source.mappers import BookingHistoryRecordMapper, get_booking_history_record_mapper

logger = logging.getLogger(__name__)

class BookingHistoryService:
    def __init__(
        self,
        booking_history_repository: BookingHistoryRepository,
        history_record_mapper: BookingHistoryRecordMapper,
    ):
        self._booking_history_repository = booking_history_repository
        self._history_record_mapper = history_record_mapper

    async def create_record(
        self,
        create_booking_history_record_dto: CreateBookingHistoryRecordDto,
    ) -> ExistingBookingHistoryRecordDto:
        db_record: db.BookingHistoryRecord = await self._booking_history_repository.create(
            create_booking_history_record_dto,
        )

        return self._history_record_mapper.to_existing_record_dto(db_record)

    async def for_user(self, user_id: str) -> List[ExistingBookingHistoryRecordDto]:
        try:
            booking_history_records: List[db.BookingHistoryRecord] = (
                await self._booking_history_repository
                .fetch_for_user(user_id=user_id)
            )

            return [
                self._history_record_mapper.to_existing_record_dto(cur_record)
                for cur_record in booking_history_records
            ]
        except Exception as err:
            logger.exception(f"Failed to fetch booking history records for user {user_id}: {err}")

            return []

def get_booking_history_service(
    booking_history_repository: Annotated[BookingHistoryRepository, Depends(get_booking_history_repository)],
    history_record_mapper: Annotated[BookingHistoryRecordMapper, Depends(get_booking_history_record_mapper)],
):
    return BookingHistoryService(
        booking_history_repository=booking_history_repository,
        history_record_mapper=history_record_mapper,
    )

__all__ = [
    "BookingHistoryService",
    "get_booking_history_service",
]