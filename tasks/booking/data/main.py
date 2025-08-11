import grpc
from concurrent import futures
from asyncio import get_event_loop

from proto import booking_pb2_grpc
from files.controllers import booking_controller
from settings.kafka_settings.publisher import kafka_event_publisher


def serve():
    try:
        loop = get_event_loop()
        loop.run_until_complete(kafka_event_publisher.start())

        server = grpc.aio.server()
        booking_pb2_grpc.add_BookingServiceServicer_to_server(
            booking_controller, server
        )
        server.add_insecure_port("[::]:9090")
        server.start()
        server.wait_for_termination()

    finally:
        pass


if __name__ == "__main__":
    serve()
