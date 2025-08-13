import grpc
from asyncio import run, sleep
from logging import INFO, getLogger, basicConfig

from proto import booking_pb2_grpc
from files.controllers import booking_controller
from settings.kafka_settings.publisher import kafka_event_publisher

basicConfig(level=INFO)


logger = getLogger("main")


async def initialize_kafka_producer():
    retries = 5
    for _ in range(retries):
        try:
            await kafka_event_publisher.start()
            break  # Exit the loop if successful
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}. Retrying in 5 seconds...")
            await sleep(5)  # Wait before retrying
    else:
        logger.critical("Could not connect to Kafka after several attempts.")
        raise RuntimeError("Kafka connection failed")


async def serve():
    await sleep(15)
    try:
        await initialize_kafka_producer()

        server = grpc.aio.server()
        booking_pb2_grpc.add_BookingServiceServicer_to_server(
            booking_controller, server
        )
        server.add_insecure_port("[::]:9090")
        await server.start()
        logger.info("gRPC server started on port 9090.")
        await server.wait_for_termination()

    finally:
        await kafka_event_publisher.stop()
        logger.info("Kafka producer stopped.")


if __name__ == "__main__":
    run(serve())
    logger.info("Server has been started")
