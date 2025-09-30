import os

from fastapi import FastAPI
import logging
from dotenv import load_dotenv

load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



app = FastAPI(
    title="Booking Service API",
    description="Микросервис для управления бронированиями отелей (gRPC + Kafka)",
    version="1.0.0",
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "booking"}


@app.get("/ready")
async def ready_check():
    return {"status": "ready", "service": "booking"}


@app.get("/ping")
async def root():
    return "pong"

if os.getenv("ENABLE_FEATURE_X", "false").lower() == "true":
    @app.get("/feature")
    async def get_feature():
        return "Feature X is enabled!"



if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)