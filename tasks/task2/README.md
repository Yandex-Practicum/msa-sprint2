## 🛠️ Подготовка окружения

1. Выполните в папке первого задания 
```bash
docker compose down
```
Это связано с тем, что необходима пересборка контейнера для задания 2.
И затем поднимите приложение в папке второго задания:
```bash
docker compose up -d --build
```
---

## 🚀 Проверка корректности

В логах приложения должно быть:
```
➡️  BookingService beans:
    - bookingService: class com.hotelio.monolith.service.BookingService
    - grpcBookingService: class com.hotelio.GrpcBookingService
```

При запуске тестов, тесты на booking должны упасть.

docker run --rm --network hotelio-net \
  -e DB_HOST=hotelio-db \
  -e DB_PORT=5432 \
  -e DB_NAME=hotelio \
  -e DB_USER=hotelio \
  -e DB_PASSWORD=hotelio \
  -e API_URL=http://hotelio-monolith:8080 \
  -e BOOKING_DB_HOST=booking-service-db \
  -e BOOKING_DB_PORT=5432 \
  -e BOOKING_DB_NAME=booking_service \
  -e BOOKING_DB_USER=userhotelio \
  -e BOOKING_DB_PASSWORD=passhotelio \
  -e BOOKING_API_URL=http://booking-service:8080 \
  hotelio-tester

---
