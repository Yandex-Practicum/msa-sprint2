from logging import getLogger, DEBUG

from asyncio.exceptions import CancelledError

from uvicorn import run
from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder

from settings import settings

logger = getLogger("logger")
logger.setLevel(DEBUG)


async def get_pong():
    return jsonable_encoder("pong")


async def enable_feature():
    return jsonable_encoder("Feature X is enabled!")


app = FastAPI(title="booking-service")

app.add_api_route(
    path="/ping",
    endpoint=get_pong,
    methods=["GET"],
)

if settings.ENABLE_FEATURE_X == True:
    app.add_api_route(
        path="/feature",
        endpoint=enable_feature,
        methods=["GET"],
    )

if __name__ == "__main__":
    try:
        run(
            app='main:app',
            reload=True,
            log_level="debug",
            host="0.0.0.0",
            port=8080,
        )
    except CancelledError:
        logger.log("App has been stopped")

    except KeyboardInterrupt:
        logger.log("App has been stopped now")