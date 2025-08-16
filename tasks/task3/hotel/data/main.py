import grpc
from asyncio import run, sleep
from logging import INFO, getLogger, basicConfig

from proto import hotel_pb2_grpc
from files.controllers import hotel_controller
from settings.kafka_settings.publisher import kafka_event_publisher

basicConfig(level=INFO)


logger = getLogger("[BOOKING: MAIN]")


async def serve():
    server = grpc.aio.server()
    hotel_pb2_grpc.add_BookingServiceServicer_to_server(hotel_controller, server)
    server.add_insecure_port("[::]:9090")
    await server.start()

    logger.info("gRPC server started on port 9090.")
    await server.wait_for_termination()


if __name__ == "__main__":
    run(serve())
    logger.info("Server has been started")
