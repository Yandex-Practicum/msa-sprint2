import logging
from asyncio import run
from tasks.booking_history.data.files.controllers import consumer

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("main")


async def main():
    try:
        await consumer.start()
        await consumer.consume_messages()
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    finally:
        await consumer.stop()


if __name__ == "__main__":
    run(main())
