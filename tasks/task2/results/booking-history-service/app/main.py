from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
import threading
from app.database import engine, Base
from app.kafka_consumer import BookingHistoryConsumer

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def start_kafka_consumer():
    """Запуск Kafka consumer в отдельном потоке"""
    consumer = BookingHistoryConsumer()
    consumer.start_consuming()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - создаем таблицы и запускаем Kafka consumer
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

    # Запускаем Kafka consumer в отдельном потоке
    kafka_thread = threading.Thread(target=start_kafka_consumer, daemon=True)
    kafka_thread.start()
    logger.info("Kafka consumer started in background thread")

    yield

    # Shutdown
    logger.info("Shutting down booking history service")


app = FastAPI(
    title="Booking History Service API",
    description="Микросервис для сбора статистики бронирований",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "booking-history"}


@app.get("/")
async def root():
    return {
        "message": "Booking History Service is running",
        "kafka_topic": "booking-events"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)