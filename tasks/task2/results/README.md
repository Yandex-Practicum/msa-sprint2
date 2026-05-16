# Миграция Booking Service — Результаты

## Стратегия миграции данных (Strangler Fig)

### AS-IS
Монолит управляет всеми бронированиями через REST API. Данные хранятся в общей БД `hotelio`.

### TO-BE
- Booking Service — независимый микросервис со своей БД `booking`
- Взаимодействие через gRPC (контракт `booking.BookingService/CreateBooking`)
- Монолит проксирует REST-запросы бронирований в booking-service через gRPC
- События `BookingCreated` публикуются в Kafka (`booking-events`)
- Booking History Service потребляет события и формирует статистику асинхронно, без нагрузки на боевую БД

### Стратегия миграции
1. **Фаза 1 (текущая):** Параллельная работа. Монолит проксирует создание бронирований в booking-service. GET /api/bookings временно остаётся в монолите.
2. **Фаза 2:** Полное переключение. GET /api/bookings переносится в booking-service (ListBookings). CDC синхронизирует данные.
3. **Фаза 3:** Аналитика на основе истории Kafka. Боевая БД освобождается от read-нагрузки.
