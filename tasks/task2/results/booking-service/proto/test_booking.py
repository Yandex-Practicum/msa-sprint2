import grpc
import sys
import os

# Добавляем путь к proto
sys.path.append(os.path.dirname(__file__))

try:
    from proto import booking_pb2
    from proto import booking_pb2_grpc
except ImportError:
    print("Failed to import proto files")
    sys.exit(1)


def test_grpc():
    try:
        # Подключаемся к серверу
        channel = grpc.insecure_channel('localhost:9090')
        stub = booking_pb2_grpc.BookingServiceStub(channel)

        print("Testing gRPC connection...")

        # Тест 1: ListBookings с пустым user_id
        print("Test 1: ListBookings with empty user_id")
        response = stub.ListBookings(
            booking_pb2.BookingListRequest(user_id=""))
        print(f"✓ Success! Received {len(response.bookings)} bookings")

        # Тест 2: ListBookings без user_id
        print("Test 2: ListBookings without user_id")
        response = stub.ListBookings(
            booking_pb2.BookingListRequest(user_id=""))
        print(f"✓ Success! Received {len(response.bookings)} bookings")

        # Тест 3: CreateBooking
        print("Test 3: CreateBooking")
        create_response = stub.CreateBooking(booking_pb2.BookingRequest(
            user_id="test_user_123",
            hotel_id="test_hotel_456",
            promo_code="TEST10"
        ))
        print(f"✓ Success! Created booking: {create_response.id}")

        return True

    except Exception as e:
        print(f"✗ gRPC test failed: {e}")
        return False


if __name__ == '__main__':
    test_grpc()