from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
import threading
from app.database import engine, Base
from app.grpc_server import serve as grpc_serve

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - создаем таблицы и запускаем gRPC сервер
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

    # Запускаем gRPC сервер в отдельном потоке
    grpc_thread = threading.Thread(target=grpc_serve, daemon=True)
    grpc_thread.start()
    logger.info("gRPC server started in background thread")

    yield

    # Shutdown
    logger.info("Shutting down booking service")


app = FastAPI(
    title="Booking Service API",
    description="Микросервис для управления бронированиями отелей (gRPC + Kafka)",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "booking"}


@app.get("/")
async def root():
    return {
        "message": "Booking Service is running",
        "grpc_port": 9090,
        "rest_port": 8000,
        "kafka": "booking-events"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)