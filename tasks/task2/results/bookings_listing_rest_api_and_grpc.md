## Requesting bookings through a REST API (Monolith)
```bash
➜  results git:(homework_sprint_2) ✗ curl 'http://localhost:8084/api/bookings?userId=test-user-2' | python -m json.tool 
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   316    0   316    0     0   1595      0 --:--:-- --:--:-- --:--:--  1595
```
```json
[
    {
        "id": 156,
        "userId": "test-user-2",
        "hotelId": "test-hotel-1",
        "promoCode": "test-hotel-1",
        "discountPercent": 10.0,
        "price": 90.0,
        "createdAt": "2025-10-05T17:32:20Z"
    },
    {
        "id": 159,
        "userId": "test-user-2",
        "hotelId": "test-hotel-1",
        "promoCode": "test-hotel-1",
        "discountPercent": 10.0,
        "price": 100.0,
        "createdAt": "2025-10-05T17:32:21Z"
    }
]
```

## Requesting bookings through GRPC API (BookingService)
```bash
➜  results git:(homework_sprint_2) ✗ grpcurl -import-path ../ -proto ../booking.proto -d '{"user_id":"test-user-2"}' -plaintext localhost:50051 booking.BookingService/ListBookings
````
```json
{
  "bookings": [
    {
      "id": "156",
      "userId": "test-user-2",
      "hotelId": "test-hotel-1",
      "promoCode": "test-hotel-1",
      "discountPercent": 10,
      "price": 90,
      "createdAt": "2025-10-05T17:32:20Z"
    },
    {
      "id": "159",
      "userId": "test-user-2",
      "hotelId": "test-hotel-1",
      "promoCode": "test-hotel-1",
      "discountPercent": 10,
      "price": 100,
      "createdAt": "2025-10-05T17:32:21Z"
    }
  ]
}
```