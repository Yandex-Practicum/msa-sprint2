from sqlalchemy.orm import Session
from typing import List, Optional
from app.db_models import BookingDB

class BookingRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_booking(self, booking_data: dict) -> BookingDB:
        db_booking = BookingDB(**booking_data)
        self.db.add(db_booking)
        self.db.commit()
        self.db.refresh(db_booking)
        return db_booking

    def get_booking_by_id(self, booking_id: int) -> Optional[BookingDB]:
        return self.db.query(BookingDB).filter(BookingDB.id == booking_id).first()

    def get_bookings_by_user_id(self, user_id: str) -> List[BookingDB]:
        return self.db.query(BookingDB).filter(BookingDB.user_id == user_id).all()

    def get_all_bookings(self) -> List[BookingDB]:
        return self.db.query(BookingDB).all()

    def delete_booking(self, booking_id: int) -> bool:
        booking = self.get_booking_by_id(booking_id)
        if booking:
            self.db.delete(booking)
            self.db.commit()
            return True
        return False