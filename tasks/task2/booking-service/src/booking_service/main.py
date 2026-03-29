from __future__ import annotations

import logging
import signal
import sys
from concurrent import futures

import grpc

from booking_service import booking_pb2_grpc
from booking_service.config import GRPC_PORT
from booking_service.db import connect, init_schema
from booking_service.kafka_out import BookingEventProducer
from booking_service.monolith_client import MonolithClient
from booking_service.servicer import BookingGrpcServicer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("booking_service")


def main() -> None:
    conn = connect()
    try:
        init_schema(conn)
    finally:
        conn.close()

    monolith = MonolithClient()
    producer = BookingEventProducer()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    booking_pb2_grpc.add_BookingServiceServicer_to_server(
        BookingGrpcServicer(monolith, producer), server
    )
    server.add_insecure_port(f"[::]:{GRPC_PORT}")

    def shutdown(*_args) -> None:
        log.info("shutting down")
        server.stop(5)
        producer.close()
        monolith.close()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    server.start()
    log.info("booking gRPC listening on :%s", GRPC_PORT)
    server.wait_for_termination()


if __name__ == "__main__":
    main()
