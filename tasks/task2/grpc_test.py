import grpc
import booking_pb2
import booking_pb2_grpc
import logging

# Configure the root logger to output to the console
logging.basicConfig(
    level=logging.INFO, # Set the minimum level to log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format='%(asctime)s - %(levelname)s - %(message)s', # Define the output format
    datefmt='%Y-%m-%d %H:%M:%S' # Define the timestamp format
)


def make_request():
    # 1. Open an insecure channel to the server
    with grpc.insecure_channel('booking-service:50051') as channel:
        # 2. Create a stub (client)
        stub = booking_pb2_grpc.BookingServiceStub(channel)
        
        # 3. Construct the request message
        # Optional fields like promo_code can be omitted or set normally
        request = booking_pb2.BookingRequest(
            user_id="user_123",
            hotel_id="hotel_456",
            promo_code="SAVE2026" 
        )
        
        # 4. Call the specific method (e.g., CreateBooking)
        try:
            response = stub.CreateBooking(request)
            logging.info(f"Booking Response: {response}")
            
            request = booking_pb2.BookingListRequest( user_id = "user_123" )
            response = stub.ListBookings(request)
            logging.info(f"List bookings: {response}")
        
        except grpc.RpcError as e:
            print(f"gRPC Error: {e.code()} - {e.details()}")

if __name__ == "__main__":
    make_request()
