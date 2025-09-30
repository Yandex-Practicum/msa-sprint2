from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.db_models import BookingHistory, UserStats, HotelStats, DailyStats


class HistoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_booking_history(self, event_data: dict) -> BookingHistory:
        history = BookingHistory(**event_data)
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_or_create_user_stats(self, user_id: str) -> UserStats:
        stats = self.db.query(UserStats).filter(
            UserStats.user_id == user_id).first()
        if not stats:
            stats = UserStats(user_id=user_id)
            self.db.add(stats)
            self.db.commit()
            self.db.refresh(stats)
        return stats

    def update_user_stats(self, user_id: str, price: float):
        stats = self.get_or_create_user_stats(user_id)
        stats.total_bookings += 1
        stats.total_spent += price
        stats.avg_booking_value = stats.total_spent / stats.total_bookings
        stats.last_booking_date = date.today()
        self.db.commit()

    def get_or_create_hotel_stats(self, hotel_id: str) -> HotelStats:
        stats = self.db.query(HotelStats).filter(
            HotelStats.hotel_id == hotel_id).first()
        if not stats:
            stats = HotelStats(hotel_id=hotel_id)
            self.db.add(stats)
            self.db.commit()
            self.db.refresh(stats)
        return stats

    def update_hotel_stats(self, hotel_id: str, price: float):
        stats = self.get_or_create_hotel_stats(hotel_id)
        stats.total_bookings += 1
        stats.total_revenue += price
        stats.avg_booking_value = stats.total_revenue / stats.total_bookings
        self.db.commit()

    def get_or_create_daily_stats(self, stat_date: date) -> DailyStats:
        stats = self.db.query(DailyStats).filter(
            DailyStats.stat_date == stat_date).first()
        if not stats:
            stats = DailyStats(stat_date=stat_date)
            self.db.add(stats)
            self.db.commit()
            self.db.refresh(stats)
        return stats

    def update_daily_stats(self, stat_date: date, price: float, user_id: str):
        stats = self.get_or_create_daily_stats(stat_date)
        stats.total_bookings += 1
        stats.total_revenue += price

        # Обновляем количество уникальных пользователей за день
        from sqlalchemy import func
        unique_users = self.db.query(
            func.count(BookingHistory.user_id.distinct())).filter(
            func.date(BookingHistory.created_at) == stat_date
        ).scalar()
        stats.unique_users = unique_users

        stats.avg_booking_value = stats.total_revenue / stats.total_bookings
        self.db.commit()