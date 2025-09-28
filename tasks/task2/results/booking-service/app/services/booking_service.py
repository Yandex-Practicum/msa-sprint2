from typing import List, Optional
from sqlalchemy.orm import Session
import logging

from app.repositories.booking_repository import BookingRepository
from app.models import BookingResponse, BookingListResponse
from app.kafka_producer import BookingKafkaProducer

logger = logging.getLogger(__name__)


class BookingService:
    def __init__(self, db: Session):
        self.booking_repository = BookingRepository(db)
        self.kafka_producer = BookingKafkaProducer()
        logger.info("BookingService initialized with database and Kafka")

    def create_booking_sync(self, user_id: str, hotel_id: str,
                            promo_code: Optional[str] = None) -> Optional[
        BookingResponse]:
        """Синхронная версия для gRPC"""
        try:
            logger.info(
                f"Creating booking: user_id={user_id}, hotel_id={hotel_id}, promo_code={promo_code}")

            # Расчет цены и скидки
            base_price = 100.0
            discount_percent = 10.0 if promo_code else 0.0
            final_price = base_price * (1 - discount_percent / 100)

            booking_data = {
                "user_id": user_id,
                "hotel_id": hotel_id,
                "promo_code": promo_code,
                "discount_percent": discount_percent,
                "price": final_price
            }

            db_booking = self.booking_repository.create_booking(booking_data)
            booking_response = BookingResponse(
                id=str(db_booking.id),
                user_id=db_booking.user_id,
                hotel_id=db_booking.hotel_id,
                promo_code=db_booking.promo_code,
                discount_percent=db_booking.discount_percent,
                price=db_booking.price,
                created_at=db_booking.created_at.isoformat()
            )

            # Отправляем событие в Kafka
            self.kafka_producer.send_booking_created_event({
                "id": str(db_booking.id),
                "user_id": db_booking.user_id,
                "hotel_id": db_booking.hotel_id,
                "price": db_booking.price,
                "discount_percent": db_booking.discount_percent,
                "created_at": db_booking.created_at.isoformat(),
                "promo_code": db_booking.promo_code
            })

            return booking_response

        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            return None

    def list_bookings_by_user_sync(self, user_id: str) -> BookingListResponse:
        """Синхронная версия для gRPC"""
        try:
            logger.info(f"Listing bookings for user: {user_id}")
            db_bookings = self.booking_repository.get_bookings_by_user_id(
                user_id)

            bookings = []
            for db_booking in db_bookings:
                bookings.append(BookingResponse(
                    id=str(db_booking.id),
                    user_id=db_booking.user_id,
                    hotel_id=db_booking.hotel_id,
                    promo_code=db_booking.promo_code,
                    discount_percent=db_booking.discount_percent,
                    price=db_booking.price,
                    created_at=db_booking.created_at.isoformat()
                ))

            return BookingListResponse(bookings=bookings)

        except Exception as e:
            logger.error(f"Error listing bookings for user {user_id}: {e}")
            return BookingListResponse(bookings=[])

    def list_all_bookings_sync(self) -> BookingListResponse:
        """Синхронная версия для gRPC"""
        try:
            logger.info("Listing all bookings")
            db_bookings = self.booking_repository.get_all_bookings()

            bookings = []
            for db_booking in db_bookings:
                bookings.append(BookingResponse(
                    id=str(db_booking.id),
                    user_id=db_booking.user_id,
                    hotel_id=db_booking.hotel_id,
                    promo_code=db_booking.promo_code,
                    discount_percent=db_booking.discount_percent,
                    price=db_booking.price,
                    created_at=db_booking.created_at.isoformat()
                ))

            return BookingListResponse(bookings=bookings)

        except Exception as e:
            logger.error(f"Error listing all bookings: {e}")
            return BookingListResponse(bookings=[])

    def shutdown(self):
        """Завершение работы сервиса"""
        self.kafka_producer.close()