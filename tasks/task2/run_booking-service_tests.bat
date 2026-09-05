echo "Create booking by gRPC"
grpcurl -plaintext -d "{\"user_id\":\"test-user-3\",\"hotel_id\":\"test-hotel-1\"}" localhost:9090 booking.BookingService/CreateBooking

echo "List bookings by user REST"
grpcurl -plaintext -d "{\"user_id\":\"test-user-3\"}" localhost:9090 booking.BookingService/ListBookings

echo "Create booking by REST"
curl -sSf -X POST "http://localhost:8085/api/bookings?userId=test-user-3&hotelId=test-hotel-1&promoCode=TESTCODE1"  

echo "List bookings by user REST"
curl -sSf "http://localhost:8085/api/bookings?userId=test-user-3"

echo "List ALL bookings REST"
curl -sSf "http://localhost:8085/api/bookings"
