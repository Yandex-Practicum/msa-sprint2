import grpc
from asyncio import run, sleep
from logging import INFO, getLogger, basicConfig

from proto import booking_pb2_grpc
from files.controllers import booking_controller

basicConfig(level=INFO)


logger = getLogger("[BOOKING: MAIN]")


async def serve():
    await sleep(15)
    try:
        server = grpc.aio.server()
        booking_pb2_grpc.add_BookingServiceServicer_to_server(
            booking_controller, server
        )
        server.add_insecure_port("[::]:9090")
        await server.start()
        logger.info("gRPC server started on port 9090.")
        await server.wait_for_termination()

    finally:
        logger.info("Kafka producer stopped.")


if __name__ == "__main__":
    run(serve())
    logger.info("Server has been started")
