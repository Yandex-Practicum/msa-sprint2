from contextlib import asynccontextmanager

from fastapi import FastAPI
import logging

import os
import sys

from .settings import get_settings

# See https://github.com/grpc/grpc/issues/29459#issuecomment-1641587881
grpc_api_code_path = os.path.abspath("./src/grpc_api")
if grpc_api_code_path not in sys.path:
    sys.path.append(grpc_api_code_path)

from .grpc_api.server import make_async_grpc_server

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    server = make_async_grpc_server()
    listen_addr = settings.GRPC_SERVER_ADDRESS
    server.add_insecure_port(listen_addr)
    logger.info(f"Starting BookingService GRPC server on {listen_addr}")

    await server.start()
    logger.info("BookingService server has been started")

    yield

    logger.info("Shutting down a GRPC server")
    await server.stop(settings.GRPC_SHUTDOWN_GRACE_PERIOD_SEC)
    logger.info("GRPC server has been successfully shut down")
    logger.info("Booking service has been shut down...")


app = FastAPI(lifespan=lifespan)

@app.get("/ping")
async def handle_ping():
    return "pong"