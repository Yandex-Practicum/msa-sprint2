import asyncio
import logging
import signal

import grpc

import booking_pb2_grpc
from .grpc_booking_service_impl import GrpcBookingService


def make_async_grpc_server():
    server = grpc.aio.server()
    booking_pb2_grpc.add_BookingServiceServicer_to_server(GrpcBookingService(), server)

    return server


async def _spawn_async_grpc_server() -> None:
    server = make_async_grpc_server()
    listen_addr = "[::]:50051"
    server_shutdown_grace_period_sec = 5
    server.add_insecure_port(listen_addr)
    logging.info(f"Starting GRPC server on {listen_addr}")

    shutdown_event = asyncio.Event()
    aio_loop = asyncio.get_running_loop()
    aio_loop.add_signal_handler(signal.SIGINT, shutdown_event.set)

    await server.start()
    logging.info("Server started")

    await shutdown_event.wait()
    logging.info("Received a shutdown command. Gracefully shutting down...")

    await server.stop(server_shutdown_grace_period_sec)
    logging.info("GRPC server has been successfully shut down")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_spawn_async_grpc_server())