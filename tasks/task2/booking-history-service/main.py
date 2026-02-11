import logging
import threading

from flask import Flask, jsonify
from sqlalchemy import func, select

from config import settings
from consumer import run_consumer
from database import SessionLocal, init_db
from models import BookingHistory
from routes import bp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(bp)

    @app.get("/health")
    def health():
        with SessionLocal() as session:
            count = session.scalar(select(func.count()).select_from(BookingHistory))
        return jsonify({"status": "ok", "total_bookings": count})

    return app


if __name__ == "__main__":
    init_db()

    t = threading.Thread(target=run_consumer, daemon=True)
    t.start()

    app = create_app()
    logger.info("booking-history-service starting on port %d", settings.http_port)
    app.run(host="0.0.0.0", port=settings.http_port)
