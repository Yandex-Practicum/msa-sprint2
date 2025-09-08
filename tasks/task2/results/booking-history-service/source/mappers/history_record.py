import uuid

import source.database.models as db
from source.dto import ExistingBookingHistoryRecordDto


class BookingHistoryRecordMapper:
    @staticmethod
    def to_existing_record_dto(db_record: db.BookingHistoryRecord) -> ExistingBookingHistoryRecordDto:
        existing_booking_history_record_dto = ExistingBookingHistoryRecordDto(
            id=uuid.UUID(str(db_record.id)),
            booked_at=str(db_record.booked_at),
            booking_id=str(db_record.booking_id),
            discount_percent=db_record.discount_percent + 0,
            hotel_id=str(db_record.hotel_id),
            price=db_record.price + 0,
            promo_code=str(db_record.promo_code),
            user_id=str(db_record.user_id),
        )

        return existing_booking_history_record_dto

def get_booking_history_record_mapper() -> BookingHistoryRecordMapper:
    return BookingHistoryRecordMapper()

__all__ = [
    "BookingHistoryRecordMapper",
    "get_booking_history_record_mapper",
]