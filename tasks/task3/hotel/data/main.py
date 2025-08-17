import grpc
from asyncio import run
from logging import INFO, getLogger, basicConfig

from proto import hotel_pb2_grpc
from files.controllers import hotel_controller
from settings.settings import settings

basicConfig(level=INFO)


logger = getLogger("[BOOKING: MAIN]")


async def serve():
    server = grpc.aio.server()
    hotel_pb2_grpc.add_HotelServiceServicer_to_server(hotel_controller, server)
    server.add_insecure_port(f"[::]:{settings.G_RPC_PORT}")
    await server.start()

    logger.info(f"gRPC server started on port {settings.G_RPC_PORT}.")
    await server.wait_for_termination()


if __name__ == "__main__":
    run(serve())
    logger.info("Server has been started")
