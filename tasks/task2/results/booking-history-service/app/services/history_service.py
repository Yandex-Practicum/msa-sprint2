import logging
from datetime import date
from sqlalchemy.orm import Session
from app.repositories.history_repository import HistoryRepository

logger = logging.getLogger(__name__)


class HistoryService:
    def __init__(self, db: Session):
        self.history_repository = HistoryRepository(db)
        logger.info("HistoryService initialized")

    def process_booking_created_event(self, event_data: dict):
        """Обработка события создания бронирования"""
        try:
            logger.info(
                f"Processing BookingCreated event: {event_data['booking_id']}")

            # Сохраняем в историю
            history_record = self.history_repository.create_booking_history({
                "booking_id": event_data["booking_id"],
                "user_id": event_data["user_id"],
                "hotel_id": event_data["hotel_id"],
                "price": event_data["price"],
                "discount_percent": event_data["discount_percent"],
                "promo_code": event_data.get("promo_code"),
                "event_type": "BookingCreated"
            })

            # Обновляем статистику пользователя
            self.history_repository.update_user_stats(
                event_data["user_id"],
                event_data["price"]
            )

            # Обновляем статистику отеля
            self.history_repository.update_hotel_stats(
                event_data["hotel_id"],
                event_data["price"]
            )

            # Обновляем дневную статистику
            today = date.today()
            self.history_repository.update_daily_stats(
                today,
                event_data["price"],
                event_data["user_id"]
            )

            logger.info(
                f"Successfully processed booking {event_data['booking_id']}")
            return True

        except Exception as e:
            logger.error(f"Error processing booking event: {e}")
            return False