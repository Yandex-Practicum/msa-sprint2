# Задание 2. Реализация новых сервисов - результаты

## Что реализовано

Поэтапная миграция по Strangler Fig: из монолита выделен сервис бронирований **booking-service** (gRPC) и добавлен аналитический сервис **booking-history-service** (Kafka consumer). Логика остальных сервисов (пользователи, отели, промокоды, отзывы) **не переносится** - монолит продолжает её обслуживать и отдаёт по REST.

### Компоненты

| Компонент | Роль | Порт наружу | БД |
|-----------|------|-------------|----|
| `hotelio-monolith` | Spring Boot, входная точка REST. Проксирует create/list bookings на gRPC `booking-service` через `GrpcBookingService` (активируется env `BOOKING_SERVICE_EXTERNAL_HOST/PORT`) | 8084 | `hotelio-db` (5433): users, hotels, promos, reviews |
| `booking-service` | **Новый gRPC-сервер** (Python, `booking.proto`). Принимает `CreateBooking`/`ListBookings`, выполняет валидацию и расчёт цены, получая данные через REST от монолита; сохраняет брони в отдельную БД и публикует событие `BookingCreated` в Kafka | 9090 | `booking-db` (5434): booking |
| `booking-history-service` | **Новый Kafka consumer** (Python). Слушает топик `booking-created`, пишет исторические записи и агрегирует статистику по пользователям/отелям/дням - без нагрузки на боевую БД | - | `history-db` (5435): booking_history, booking_stats_daily |
| `kafka` + `zookeeper` | Шина событий (Confluent Kafka 7.2.1) | 9092 / 2181 | - |

Все контейнеры - в общей сети `hotelio-net`.

### Поток создания бронирования (новый путь)

```
POST /api/bookings  (монолит)
   └─> gRPC CreateBooking  (booking-service, порт 9090)
         ├─ REST: GET  /api/users/{id}/...          (монолит)
         ├─ REST: GET  /api/hotels/{id}/operational,
         │            /fully-booked, /reviews/trusted (монолит)
         ├─ REST: POST /api/promos/validate          (монолит)
         ├─ расчёт цены (VIP => 80, обычный => 100, минус скидка промо)
         ├─ INSERT в booking-db (отдельная БД)
         └─ publish Kafka topic `booking-created` (BookingCreated)
               └─> booking-history-service  =>  INSERT в history-db + агрегация
```

Список бронирований `GET /api/bookings?userId=...` также возвращается через gRPC из `booking-service` (см. `listing-rest-grpc.txt`).

## Стратегия миграции данных при запуске нового сервиса

1. **Не отключаем старый путь сразу.** На время миграции монолит по-прежнему разворачивается целиком и хранит данные пользователей, отелей, промокодов и отзывов. Бронирования - единственный домен, который переезжает.
2. **Разделение базы по домену.** Для `booking-service` создана отдельная БД `booking_service` (контейнер `booking-db`). Таблица `booking` больше не пишется монолитом: монолит перенаправляет создание брони на gRPC-сервер, а в своей БД таблицу `booking` оставляет пустой.
3. **Данные в микросервисе получаются через REST.** `booking-service` не дублирует логику валидации (пользователь, отель, промокод, репутация по отзывам), а запрашивает её у монолита по REST.
4. **Историю пишем асинхронно через Kafka.** Аналитике нужны данные по бронированиям (по пользователям, отелям, дням), но DevOps не даёт доступ к боевой БД. Поэтому `booking-service` публикует событие `BookingCreated`, а отдельный `booking-history-service` потребляет его и формирует историю и статистику в своей БД - **без нагрузки на боевую базу**.
5. **Возможен backfill.** Если нужно перенести исторические брони из старой БД монолита в новую - запускается разовая миграция (INSERT из `monolith.booking` в `booking_service.booking` с репликацией через топик Kafka для консистентности событий).

## Стратегия To-Be

- **Входной точкой booking-логики становится микросервис.** Монолит больше не создаёт брони сам, а выступает прокси: принимает REST-запрос и передаёт управление `booking-service` по gRPC.
- **Все остальные вызовы остаются в монолите** - user/hotel/promo/review живут там и доступны по REST, пока не будут мигрированы отдельными шагами Strangler Fig.
- **Асинхронная аналитика вынесена в отдельный сервис** и работает через событийную шину (Kafka), что развязывает сервисы и убирает нагрузку с боевой БД.
- **Дальнейшие шаги:** миграция Hotel/User/Promo/Review сервисов, перенос логики валидации в сами сервисы, замена REST-вызовов между ними, введение BFF/GraphQL.

## Проверка корректности

В логах монолита видны оба бина (прокси активен):

```
➡️  BookingService beans:
    - bookingService: class com.hotelio.monolith.service.BookingService
    - grpcBookingService: class com.hotelio.GrpcBookingService
```

Регрессионный тест (`test/regress.sh`) проходит полностью, включая тесты бронирования, которые теперь идут через gRPC. Негативные сценарии (неактивный пользователь, недоверенный/полностью забронированный отель) по-прежнему отклоняются - см. `test-log.txt`.

## Файлы результатов

- `docker-ps.txt` - лог/скриншот `docker ps` 
- `regress.sh`, `init-fixtures.sql` - доработанные тесты (копии из `test/`)
- `test-log.txt` - проведение тестовых запросов
- `select-bookings.txt` - `SELECT * FROM booking` из новой (booking-service) и старой (monolith) систем после тестов
- `listing-rest-grpc.txt` - листинг бронирований через REST из монолита и gRPC из микросервиса
- `select-history.txt` - `SELECT *` из таблицы исторических данных о бронированиях + агрегированная статистика
