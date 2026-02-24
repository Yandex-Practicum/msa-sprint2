import os
import random
import time
import grpc

import booking_pb2
import booking_pb2_grpc


def main():
    # если запускаешь ИЗ контейнера booking-service — ставь booking-service:9090 (или localhost:9090)
    target = os.getenv("BOOKING_GRPC_TARGET", "booking-service:9090")
    n = int(os.getenv("N", "20"))

    channel = grpc.insecure_channel(target)
    stub = booking_pb2_grpc.BookingServiceStub(channel)

    users = ["u1", "u2", "u3"]
    hotels = ["h1", "h2", "h3", "h4", "h5"]
    promos = ["", "SALE10", "SALE20", ""]

    for i in range(n):
        req = booking_pb2.BookingRequest(
            user_id=random.choice(users),
            hotel_id=random.choice(hotels),
            promo_code=random.choice(promos),
        )
        resp = stub.CreateBooking(req)
        print(f"[{i+1}/{n}] id={resp.id} user={resp.user_id} hotel={resp.hotel_id} promo={resp.promo_code} price={resp.price}")
        time.sleep(0.05)

    # контрольный ListBookings
    r = stub.ListBookings(booking_pb2.BookingListRequest(user_id="u1"))
    print(f"\nListBookings(u1) -> {len(r.bookings)} items")


if __name__ == "__main__":
    main()