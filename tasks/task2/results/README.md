# Task 2: Results — booking-service (gRPC) + booking-history-service (Kafka)

## Архитектура

### Схема взаимодействия

```
Client
  │
  ▼
hotelio-monolith (8080) ─── GET /api/bookings ──► monolith-db (hotelio)
  │                                                    (фикстуры + записи из monolith DB)
  │
  └─── POST /api/bookings ──► gRPC:9090 ──► booking-service
                                                 │
                                                 ├─► REST calls ──► monolith (валидации)
                                                 ├─► booking-db (сохранение)
                                                 └─► Kafka "booking-events" ──► booking-history-service
                                                                                        │
                                                                                        └─► booking-history-db
```

## Запущенные сервисы (8 контейнеров)

| Контейнер | Образ | Порты |
|---|---|---|
| hotelio-monolith | task2-monolith | 8084→8080 |
| booking-service | task2-booking-service | 9090 (gRPC) |
| booking-history-service | task2-booking-history-service | 8085→8080 |
| hotelio-db | postgres:15 | 5432 |
| booking-db | postgres:15 | (внутр.) |
| booking-history-db | postgres:15 | (внутр.) |
| task2-kafka-1 | confluentinc/cp-kafka:7.2.1 | 9092 |
| task2-zookeeper-1 | confluentinc/cp-zookeeper:7.2.1 | 2181 |

## Тесты: 27/27 ✅

Все регрессионные тесты прошли (`test/regress.sh`). Лог в `test-log.txt`.

## Состояние баз данных после тестов

### booking-db (новые бронирования через gRPC)
Создаётся каждые POST /api/bookings — хранит новые бронирования из booking-service.

### monolith-db (hotelio)
Содержит только фикстуры. GET /api/bookings читает отсюда (Strangler Fig: старые записи остаются).

### booking-history-db
Аналитическая таблица `booking_history` — Kafka consumer пишет каждый `BookingCreatedEvent`.

## Стратегия миграции данных

### Текущая фаза (Sprint 2, ~2 месяца)

**Strangler Fig Pattern** — постепенное вытеснение монолита:

1. **POST /api/bookings** → routing через gRPC в `booking-service`
   - Новые бронирования сохраняются в `booking-db` (PostgreSQL booking-service)
   - Публикуется событие `BookingCreated` в Kafka топик `booking-events`

2. **GET /api/bookings** → читает из `monolith-db`
   - Существующие данные (до миграции) остаются в монолите
   - Это временное состояние: в конечной архитектуре GET тоже должен читать из `booking-db`

3. **booking-history-service** → Kafka consumer
   - Слушает `booking-events`, строит аналитическую БД
   - Аналитики читают из `booking-history-db` — не из боевой БД

### Целевое состояние (~1 год, полная миграция)

После завершения миграции:
- `booking-service` — единственный источник правды для бронирований
- Данные из `monolith-db.booking` мигрируются в `booking-db` (one-time ETL)
- Монолит больше не обслуживает `/api/bookings`
- `booking-history-service` продолжает получать события через Kafka

### Миграция данных (zero-downtime)

Для переноса существующих бронирований из монолита в `booking-service`:

```sql
-- 1. Скрипт миграции (одноразовый)
INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price, created_at)
SELECT user_id, hotel_id, promo_code, discount_percent, price, created_at
FROM hotelio.booking
WHERE created_at < MIGRATION_CUTOFF_TIMESTAMP;

-- 2. После миграции: перевести GET /api/bookings на чтение из booking-service
-- (убрать routing в GrpcBookingService.listAll → читать из booking-db напрямую)
```

**Риски**:
- Дублирование данных в переходный период → решается cutoff timestamp
- Latency GET (сейчас читает из монолита) → после миграции улучшится

## Ключевые технические решения

1. **gRPC-прокси в монолите**: `GrpcBookingService extends BookingService`
   - `createBooking()` → gRPC → booking-service
   - `listAll()` → local BookingRepository (monolith DB) — для совместимости с фикстурами

2. **Kafka TopicName**: `booking-events` (одиночный топик, partitions=1 для dev)

3. **booking-history-service**: group-id=`booking-history-group`, `auto-offset-reset=earliest`
   - Гарантирует получение всех событий даже при рестарте

4. **Активация gRPC-прокси**: env vars `BOOKING_SERVICE_EXTERNAL_HOST` + `BOOKING_SERVICE_EXTERNAL_PORT`
   - `@ConditionalOnProperty(prefix = "booking.service", name = "external-host")`
   - Без этих vars монолит работает в обычном режиме (task1)
