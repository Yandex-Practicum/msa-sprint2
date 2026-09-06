## 🛠️ Подготовка окружения

1. Выполните в папке первого задания
```bash
docker compose down
```
2. Создайте Docker-сеть (если ещё не создана):
```bash
docker network create hotelio-net
```
3. Поднимите приложение в папке второго задания:
```bash
docker compose up -d --build
```

## 🏗️ Архитектура

- **hotelio-monolith** (Spring Boot, порт 8084) — проксирует создание бронирования на gRPC-сервер `booking-service` (env `BOOKING_SERVICE_EXTERNAL_HOST/PORT`). Список бронирований также идёт через gRPC. Логика остальных сервисов (пользователи, отели, промокоды, отзывы) остаётся в монолите и отдаётся по REST.
- **booking-service** (gRPC, порт 9090) — новая точка входа для booking-логики. Получает данные (пользователь, отель, промокод, отзывы) через REST от монолита, сохраняет бронирование в отдельную БД `booking_service` и публикует событие `BookingCreated` в Kafka.
- **booking-history-service** — слушает топик Kafka `booking-created`, формирует историческую статистику по бронированиям (по пользователям, отелям, дням) в отдельную БД `booking_history` — без нагрузки на боевую БД.
- **monolith-db** (PostgreSQL, 5433) — данные пользователей, отелей, промокодов, отзывов.
- **booking-db** (PostgreSQL, 5434) — бронирования нового сервиса.
- **history-db** (PostgreSQL, 5435) — историческая статистика.
- **kafka / zookeeper** — шина событий.

## 🚀 Проверка корректности

В логах монолита должно быть:
```
➡️  BookingService beans:
    - bookingService: class com.hotelio.monolith.service.BookingService
    - grpcBookingService: class com.hotelio.GrpcBookingService
```

Запрос создания бронирования монолит перенаправляет на gRPC-сервер `booking-service`; список бронирований также возвращается через gRPC.

Проверка API:
```bash
curl http://localhost:8084/api/bookings
```

## 🔎 Данные о результатах

См. `results/`:
- `docker-ps.txt` — лог/скриншот `docker ps`
- `regress.sh`, `init-fixtures.sql` — доработанные тесты
- `test-log.txt` — проведение тестовых запросов
- `select-bookings.sql.txt` — `SELECT * FROM booking` из новой (booking-service) и старой (monolith) систем
- `listing-rest-grpc.txt` — листинг бронирований через REST из монолита и gRPC из микросервиса
- `select-history.txt` — `SELECT *` из таблицы исторических данных о бронированиях
- `README.md` — стратегия миграции данных
