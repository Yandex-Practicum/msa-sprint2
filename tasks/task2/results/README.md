# Задание 2 - Вынос логики бронирований: booking-service + booking-history-service

## Результат

Логика создания и листинга бронирований вынесена из монолита в новый микросервис
`booking-service`, а история бронирований накапливается в `booking-history-service`
через Kafka. В монолите остался только тонкий REST-фасад (`BookingController`), 
который проксирует вызовы в микросервис по gRPC через уже
имеющийся в монолите gRPC-прокси (`GrpcBookingService` из `p-o-y-1.0.0.jar`).

### Поток запроса (To-Be)

1. Клиент вызывает `POST /api/bookings` или `GET /api/bookings` на монолите.
2. `BookingController` (фасад) делегирует `BookingService` → `GrpcBookingService`
 (gRPC-прокси из `p-o-y.jar`), который ходит в `booking-service:9090`.
3. `booking-service` выполняет старые правила монолита, но **REST-запросами к
 монолиту** (своей БД только для бронирований):
 - `GET /api/users/{id}` → проверка ACTIVE и чёрного списка;
 - `GET /api/hotels/{id}` → проверка operational / trusted / fully-booked;
 - VIP-пользователь (status=VIP) → базовая цена 80, обычный → 100;
 - `POST /api/promocodes/validate` → применение промокода (для VIP - любые,
 для обычных - только групповой промо; активные, не истекшие).
4. Записывает бронь в свою БД `booking` (booking-db) с автоматическим
 расчётом цены, затем публикует событие `BookingCreated` в Kafka-топик
 `booking-created`.
5. `booking-history-service` (consumer, группа `booking-history-service`) читает
 событие, дедуплицирует по `booking_id` и пишет в таблицу `booking_history`.
6. Статистика отдаётся через REST-эндпоинты `booking-history-service`:
 `GET /api/statistics` (+ `?byUser=`, `?byHotel=`), `GET /api/statistics/by-user`,
 `/by-hotel`, `/by-day`.

---

## Что изменено

- `tasks/task2/booking-service/` - новый gRPC-сервис (Spring Boot 3.2.5, Java 17,
 protobuf/gRPC). Прото-контракт: `src/main/proto/booking.proto`
 (`CreateBooking`, `ListBookings`, `BookingResponse`).
- `tasks/task2/booking-history-service/` - Kafka-consumer + JPA + статистика.
- `tasks/task2/docker-compose.yml` - добавлены `booking-service`, `booking-db`
 (5433), `booking-history-service` (8082), `booking-history-db` (5434), Kafka,
 ZooKeeper.
- `hotelio-monolith/.../BookingController.java` - `userId` у `GET /api/bookings`
 теперь `@RequestParam(required=false, defaultValue="")` (фикс NPE в
 gRPC-прокси при пустом userId).
- `test/regress.sh` - секция «Тесты бронирования» переписана: бронирования
 создаются через API (их больше нет в фикстурах монолита), история проверяется
 через `HISTORY_API_URL`.

---

## Регрессионный прогон

Прогон `hotelio-tester`  - **все тесты пройдены**,
см. `test-log.txt`. Дополнительно проверены отклонения: неактивный пользователь,
недоверенный отель, полностью забронированный отель.

---

## Миграция данных (стратегия)

Бронирования - ответственность `booking-service`. Исторические данные
монолита переносятся по схеме backfill + cutover:

1. Фаза копирования (backfill).
 Из таблицы `booking` БД монолита (`hotelio-db`) делается однократный экспорт
 в шину: для каждой исторической записи публикуется событие
 `BookingCreated` с тем же `bookingId` и полем `createdAt` = исходной дате.
 `booking-history-service` читает их идемпотентно -
 вставка с дедупликацией по `booking_id` защищает от двойной обработки.
 Альтернатива для больших объёмов: прямое копирование таблиц
 (`INSERT ... SELECT` между БД) + доставка недостающих событий.

2. Фаза двойной записи (twin)
 На время пилота монолит продолжает принимать бронирования через свой фасад,
 но `BookingService` уже делегирует создание в `booking-service` (gRPC),
 поэтому все новые бронирования пишутся только в БД `booking-service`.

3. Фаза отсечения (cutover).
 Чтение истории переключается на `booking_history`/`booking` БД
 `booking-service`. Приложение получает список бронирований из микросервиса
 (gRPC `ListBookings`), монолит больше не держит бронирования в своей БД.
 Старая таблица `booking` монолита переводится в read-only и выводится из
 эксплуатации после контрольной сверки.

4. Гарантии консистентности.
 - Событие публикуется после успешной транзакции записи в собственную БД.
 - Consumer идемпотентен (дедуп по `booking_id`, eventId - UUID).
 - `eventTimestamp`/`eventTime` фиксируют момент события; `createdAt` - момент
 создания брони (сохраняется в `booking_created_at`).

---

## Состав

- REST-фасад монолита (через gRPC-прокси): `bookings-rest.txt`
 (`curl http://localhost:8084/api/bookings`).
- gRPC из `booking-service` (grpcurl, топик не используется - прямое чтение):
 `bookings-grpc.txt`
 (`docker run --network hotelio-net -v $(pwd)/proto:/proto fullstorydev/grpcurl
 -plaintext -import-path /proto -proto booking.proto -d '{"userId":""}'
 booking-service:9090 booking.BookingService/ListBookings`).
- Данные БД: `bookings-old.txt` (старая БД монолита), `bookings-new.txt` (БД
 `booking-service`), `booking-history.txt` (таблица истории).