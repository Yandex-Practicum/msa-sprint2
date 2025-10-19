import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Depends

from source.decorators import auto_di
from source.services import BookingEventWriter, get_booking_event_writer
from source.settings import get_settings
from source.routes import history_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
settings = get_settings()

class LifeSpanManager:
    @auto_di
    async def replicate_booking_messages(
        self,
        booking_event_writer: Annotated[BookingEventWriter, Depends(get_booking_event_writer)],
    ):
        await booking_event_writer.replicate()

    @asynccontextmanager
    async def __call__(self, _app: FastAPI):
        logger.info("BookingServiceHistory server has been started")

        asyncio.create_task(
            self.replicate_booking_messages(),
            name="replicate_booking_messages",
        )

        yield

        logger.info("BookingServiceHistory server has been stopped")

app = FastAPI(lifespan=LifeSpanManager())
app.include_router(history_router, prefix="/history", tags=["history"])

@app.get("/ping")
async def handle_ping():
    return "pong"