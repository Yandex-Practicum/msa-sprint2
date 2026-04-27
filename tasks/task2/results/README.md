# Task 2 results

## Что реализовано

- `booking-service`:
  - поднимается в Docker;
  - реализует `booking.proto`;
  - принимает `CreateBooking` и `ListBookings` по gRPC на `9090`;
  - хранит данные в отдельной PostgreSQL БД `booking-db`;
  - валидирует пользователя, отель, отзывы и промокод через REST API монолита;
  - публикует событие `BookingCreated` в Kafka topic `booking.created`.

- `booking-history-service`:
  - читает `BookingCreated` из Kafka;
  - пишет события в отдельную PostgreSQL БД `booking-history-db`;
  - поддерживает простые агрегаты `booking_stats_by_user` и `booking_stats_by_hotel`.

- Монолит:
  - получает `BOOKING_SERVICE_EXTERNAL_HOST=booking-service`;
  - создает primary-bean `grpcBookingService`;
  - `POST /api/bookings` и `GET /api/bookings` идут через gRPC-клиент к `booking-service`.

## Проверка

Основная проверка сохранена в `test-log.txt`.

Запуск:

```bash
cd tasks/task2
docker compose up -d --build

cd ../../test
docker build -t hotelio-tester .
docker run --rm --network hotelio-net \
  -e DB_HOST=hotelio-db \
  -e DB_PORT=5432 \
  -e DB_NAME=hotelio \
  -e DB_USER=hotelio \
  -e DB_PASSWORD=hotelio \
  -e BOOKING_DB_HOST=booking-db \
  -e BOOKING_DB_PORT=5432 \
  -e BOOKING_DB_NAME=booking \
  -e BOOKING_DB_USER=booking \
  -e BOOKING_DB_PASSWORD=booking \
  -e HISTORY_DB_HOST=booking-history-db \
  -e HISTORY_DB_PORT=5432 \
  -e HISTORY_DB_NAME=booking_history \
  -e HISTORY_DB_USER=history \
  -e HISTORY_DB_PASSWORD=history \
  -e API_URL=http://hotelio-monolith:8080 \
  hotelio-tester
```

## Миграция данных при запуске нового сервиса

Стратегия миграции:

1. Создать отдельную БД `booking-db` и таблицу `bookings`.
2. Выполнить backfill исторических бронирований из монолитной таблицы `booking` в `booking-db`.
3. Сверить количество строк и ключевые поля: `user_id`, `hotel_id`, `promo_code`, `discount_percent`, `price`, `created_at`.
4. Включить запись новых бронирований через gRPC `booking-service`.
5. Оставить монолит фасадом для существующих REST-клиентов.
6. Публиковать `BookingCreated` в Kafka для асинхронных read-models и аналитики.
7. После стабилизации признать `booking-db` источником истины для домена Booking.

В тестовом стенде backfill имитируется файлом `init-booking-fixtures.sql`: он загружает начальные бронирования в новую БД сервиса, а основной `init-fixtures.sql` загружает остальные домены в БД монолита.

## Стратегия To Be

- `booking-service` окончательно владеет таблицей бронирований и всей write-логикой.
- Монолит временно остается REST-фасадом и Anti-Corruption Layer для старых клиентов.
- `User`, `Hotel`, `PromoCode`, `Review` остаются в монолите только на промежуточном этапе; дальше они выделяются отдельными сервисами.
- Kafka становится каналом доменных событий для аналитики, истории и read-моделей.
- После выделения зависимых доменов REST-вызовы из `booking-service` заменяются на стабильные межсервисные контракты.

## Файлы результата

- `docker-ps.txt` - список запущенных контейнеров.
- `monolith-booking-beans-log.txt` - лог монолита с подтверждением `bookingService` и `grpcBookingService`.
- `test-log.txt` - полный лог регрессионной проверки.
- `regress.sh`, `init-fixtures.sql`, `init-booking-fixtures.sql` - доработанные тестовые файлы.
- `bookings-db-selects.txt` - `select *` из старой и новой таблиц бронирований.
- `booking-history-selects.txt` - данные истории и агрегатов.
- `rest-listing.txt` - листинг бронирований через REST монолита.
- `grpc-listing.txt` - листинг бронирований через gRPC `booking-service`.
