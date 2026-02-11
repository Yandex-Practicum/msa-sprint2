from flask import Blueprint, jsonify
from sqlalchemy import func, select

from database import SessionLocal
from models import BookingHistory
from schemas import BookingHistorySchema

bp = Blueprint("history", __name__, url_prefix="/history")


def _serialize(rows: list) -> list[dict]:
    return [BookingHistorySchema.model_validate(r).model_dump(mode="json") for r in rows]


@bp.get("")
def get_all():
    with SessionLocal() as session:
        rows = session.scalars(select(BookingHistory).order_by(BookingHistory.received_at.desc())).all()
    return jsonify(_serialize(rows))


@bp.get("/user/<user_id>")
def get_by_user(user_id: str):
    with SessionLocal() as session:
        rows = session.scalars(
            select(BookingHistory).where(BookingHistory.user_id == user_id).order_by(BookingHistory.received_at.desc())
        ).all()
    return jsonify(_serialize(rows))


@bp.get("/hotel/<hotel_id>")
def get_by_hotel(hotel_id: str):
    with SessionLocal() as session:
        rows = session.scalars(
            select(BookingHistory)
            .where(BookingHistory.hotel_id == hotel_id)
            .order_by(BookingHistory.received_at.desc())
        ).all()
    return jsonify(_serialize(rows))


@bp.get("/stats")
def get_stats():
    with SessionLocal() as session:
        total = session.scalar(select(func.count()).select_from(BookingHistory))
        by_hotel = session.execute(
            select(BookingHistory.hotel_id, func.count().label("bookings"))
            .group_by(BookingHistory.hotel_id)
            .order_by(func.count().desc())
        ).all()
        by_user = session.execute(
            select(BookingHistory.user_id, func.count().label("bookings"))
            .group_by(BookingHistory.user_id)
            .order_by(func.count().desc())
        ).all()
    return jsonify(
        {
            "total": total,
            "by_hotel": [{"hotel_id": h, "bookings": c} for h, c in by_hotel],
            "by_user": [{"user_id": u, "bookings": c} for u, c in by_user],
        }
    )
