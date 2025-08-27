```bash
grpcurl -plaintext -proto booking.proto -d '{ "user_id": "test-user-2" }' localhost:9090 booking.BookingService/ListBookings
```
```json
{
  "bookings": [
    {
      "id": "7",
      "userId": "test-user-2",
      "hotelId": "test-hotel-1",
      "promoCode": "TESTCODE1",
      "discountPercent": 10,
      "price": 90,
      "createdAt": "2025-08-25T19:50:14.427Z"
    },
    {
      "id": "10",
      "userId": "test-user-2",
      "hotelId": "test-hotel-1",
      "promoCode": "TESTCODE1",
      "price": 100,
      "createdAt": "2025-08-25T19:50:14.995Z"
    }
  ]
}
```
```bash
curl http://localhost:8085/api/bookings
```
```json
[{"id":7,"user_id":"test-user-2","hotel_id":"test-hotel-1","promo_code":"TESTCODE1","discount_percent":10.0,"price":90.0,"created_at":"2025-08-25T19:50:14.427Z"},{"id":8,"user_id":"test-user-3","hotel_id":"test-hotel-1","promo_code":"","discount_percent":0.0,"price":80.0,"created_at":"2025-08-25T19:50:14.427Z"},{"id":9,"user_id":"test-user-3","hotel_id":"test-hotel-1","promo_code":"","discount_percent":0.0,"price":100.0,"created_at":"2025-08-25T19:50:14.932Z"},{"id":10,"user_id":"test-user-2","hotel_id":"test-hotel-1","promo_code":"TESTCODE1","discount_percent":0.0,"price":100.0,"created_at":"2025-08-25T19:50:14.995Z"}]
```