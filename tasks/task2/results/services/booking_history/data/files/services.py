from files.repository import (
    BookingHistoryRecordRepository,
    booking_history_record_repository,
)

from files.schemas import BookingHistoryRecordSchema


class BookingHistoryRecordServices:
    def __init__(
        self,
        repository: BookingHistoryRecordRepository,
    ):
        self._repository = repository

    async def create_booking_history_record(
        self, data: BookingHistoryRecordSchema
    ) -> None:
        try:
            await self._repository.create_booking_history_record(data=data)

        except Exception as error:
            print(error)


booking_history_record_services = BookingHistoryRecordServices(
    repository=booking_history_record_repository
)
