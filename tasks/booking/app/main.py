import grpc
from concurrent import futures

from tasks.booking.app.files.proto import booking_pb2_grpc
from tasks.booking.app.files.controllers import booking_controller



def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(booking_controller, server)
    server.add_insecure_port("[::]:50051")  # Bind to port 50051
    print("gRPC Server running on port 50051...")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
