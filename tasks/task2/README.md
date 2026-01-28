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


---
