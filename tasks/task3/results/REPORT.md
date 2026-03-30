# Task 3 — GraphQL Federation Report


## Цели
- Перейти на Apollo Federation (BFF над несколькими доменами: бронирования, отели, промокоды).
- Интегрировать реальные сервисы из task2 (gRPC booking-service и монолитные REST).
- Добавить ACL на уровне резолверов (пользователь видит только свои бронирования).
- Вынести промо-логику в отдельный сабграф и переопределить поле скидки.
- Устранить проблему N+1 при загрузке отелей через батчинг/кеширование.

## Архитектура
- Gateway (`tasks/task3/gateway`) агрегирует 3 субграфа:
  - `booking-subgraph` (порт 4001): читает бронирования по gRPC из task2.
  - `hotel-subgraph` (порт 4002): данные об отелях из монолита (REST), батчинг через DataLoader.
  - `promocode-subgraph` (порт 4003): валидация промокодов в монолите и `@override` скидки.
- Все контейнеры объединены внешней сетью `hotelio-net` (общая с task2), см. `docker-compose.yml`.

## Внесённые изменения

### 1) booking-subgraph
Файлы:
- `tasks/task3/booking-subgraph/index.js`
- `tasks/task3/booking-subgraph/booking.proto` (скопирован из task2)
- `tasks/task3/booking-subgraph/package.json` (+ `@grpc/grpc-js`, `@grpc/proto-loader`)

Сделано:
- gRPC клиент к `booking-service:9090` (из task2) и резолвер `Query.bookingsByUser`.
- ACL по заголовку `userid`: данные возвращаются только если `req.headers['userid'] === userId`.
- Логирование: добавлен `[ACL] Allow: userId=…` и deny-логи.
- Для федерации добавлено поле-ссылка `Booking.hotel: Hotel` (возврат `__typename/id`).

### 2) hotel-subgraph
Файлы:
- `tasks/task3/hotel-subgraph/index.js`
- `tasks/task3/hotel-subgraph/package.json` (+ `axios`, `dataloader`)

Сделано:
- Схема `type Hotel @key(fields: "id")`.
- Добавлен батч-запрос `Query.hotelsByIds(ids: [ID!]!): [Hotel]`.
- `__resolveReference` использует DataLoader (устраняет N+1 и кеширует в пределах запроса).
- Источник данных: монолит `http://hotelio-monolith:8080` (переменная `HOTEL_API_BASE`).
  Примечание: в task2 нет эндпоинта `GET /api/hotels/{id}` с полями name/city; поэтому эти поля могут быть `null`.

### 3) promocode-subgraph
Файлы:
- `tasks/task3/promocode-subgraph/index.js`
- `tasks/task3/promocode-subgraph/package.json`
- `tasks/task3/promocode-subgraph/Dockerfile`
- `tasks/task3/promocode-subgraph/booking.proto`

Сделано:
- Перевод схемы на Federation v2: добавлен `extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key","@external","@requires","@override"])`.
- `extend type Booking @key(fields: "id")` с полями `promoCode` (external), `discountPercent @override(from: "booking-subgraph")` и `discountInfo @requires(fields: "promoCode")`.
- `discountPercent` и `discountInfo` вычисляются на основе:
  - исходной скидки из booking-service (через gRPC `ListBookings`),
  - актуальной валидации монолита `POST /api/promos/validate`.

### 4) Gateway
Файлы:
- `tasks/task3/gateway/index.js`

Сделано:
- Подключены 3 субграфа (serviceList).
- Включено пробрасывание заголовков во все субграфы через `RemoteGraphQLDataSource.willSendRequest` (важно для ACL).
- Удалена устаревшая опция `subscriptions: false` (Apollo Server v4).

### 5) Docker-compose
Файлы:
- `tasks/task3/docker-compose.yml`

Сделано:
- Добавлены сервисы `apollo-gateway`, `booking-subgraph`, `hotel-subgraph`, `promocode-subgraph`.
- Проброшены переменные окружения:
  - `BOOKING_GRPC_ADDR=booking-service:9090`
  - `HOTEL_API_BASE=http://hotelio-monolith:8080`
  - `MONOLITH_BASE_URL=http://hotelio-monolith:8080`
- Подключение к внешней сети `hotelio-net` (создать один раз: `docker network create hotelio-net`).

## ACL
- Заголовок: `userid` (нижний регистр).
- Правило: пользователь может видеть только свои записи (`userid === userId` в аргументе запроса).
- Логи: `[ACL] Deny: …` при несоответствии/отсутствии заголовка, `[ACL] Allow: …` при допуске.

## Батчинг / устранение N+1
- В `hotel-subgraph` DataLoader агрегирует запросы по hotelId в рамках одного GraphQL-запроса.
- `Query.hotelsByIds` и `Hotel.__resolveReference` используют один и тот же лоадер.


## Полученные результаты
- Работает связка: Gateway → booking-subgraph (gRPC task2) → promocode-subgraph (override, REST монолита) → hotel-subgraph (батчинг/кеширование).
- Заголовки успешно пробрасываются через Gateway во все субграфы (ACL функционирует).
- N+1 для отелей устранён за счёт DataLoader.


## Артефакты
- Скриншоты: успешный Allow и Deny (см. в отчёте/папке results).
- Логи сабграфов и `docker ps` сохранены в `tasks/task3/results/`.
