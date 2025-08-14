import logging
from asyncio import run, sleep
from files.controllers import consumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger('[LOGGING HISTORY:main.py]')


async def main():
    await sleep(15)
    try:
        await consumer.start()
        await consumer.consume_messages()
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    finally:
        await consumer.stop()


if __name__ == "__main__":
    logger.info("Strating booking history service")
    run(main())
