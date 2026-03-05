# Task 3 Report — GraphQL Federation (Personal Cabinet)

## Архитектура

Реализован федеративный GraphQL API на Apollo Federation 2 с 4 субграфами и шлюзом.

```
Client → apollo-gateway:4000
           ├── booking-subgraph:4001    (бронирования + ACL)
           ├── hotel-subgraph:4002      (отели + DataLoader)
           └── promocode-subgraph:4003 (промокоды + @override)

Все субграфы → http://hotelio-monolith:8080 (REST API монолита)
```

---

## Внесённые изменения

### 1. `booking-subgraph/index.js` — переписан полностью

**Изменения:**
- Заменены заглушки на реальные вызовы к REST-монолиту: `GET /api/bookings?userId=X`
- **ACL**: проверка `req.headers['userid'] === userId`. При несовпадении — `GraphQLError(FORBIDDEN)`
- Добавлено поле `hotel: Hotel` (федеративная ссылка на hotel-subgraph)
- Добавлен `extend type Hotel @key(fields: "id") { id: ID! @external }` для federation
- Resolver `Booking.hotel`: возвращает `{ __typename: 'Hotel', id: booking.hotelId }` — gateway подхватывает и разрешает через hotel-subgraph
- Используется native fetch (Node 18), без дополнительных зависимостей

### 2. `hotel-subgraph/index.js` — переписан полностью

**Изменения:**
- Заменены заглушки на реальные вызовы: `GET /api/hotels/{id}`
- **DataLoader** (батчинг + кеширование): при запросе N бронирований с hotel { ... } DataLoader группирует все N запросов в один тик event-loop и выполняет их параллельно через `Promise.all`
- `__resolveReference({ id })` → `hotelLoader.load(id)` — исключает дублирующиеся запросы
- `hotelsByIds(ids)` → `hotelLoader.loadMany(ids)` — bulk endpoint
- Schema обновлена под реальные поля сущности Hotel: `id, city, rating, description, operational, fullyBooked` (в монолите нет полей `name` и `stars`)
- DataLoader создаётся per-request в context (правильный паттерн)

**Решение N+1:**
```
Без DataLoader: 5 бронирований → 5 запросов GET /api/hotels/{id} (последовательно)
С DataLoader:   5 бронирований → 1 батч из 5 параллельных запросов (за один тик)
```

### 3. `hotel-subgraph/package.json`

- Добавлена зависимость `"dataloader": "^2.2.2"`

### 4. `gateway/index.js` — переписан полностью

**Изменения:**
- `serviceList` (устарел в @apollo/gateway 2.x) заменён на `IntrospectAndCompose`
- Добавлен `RemoteGraphQLDataSource` с `willSendRequest` для проброса заголовка `userid` во все субграфы
- Добавлен субграф `promocode` (port 4003)
- Убран несуществующий параметр `subscriptions: false`

### 5. `promocode-subgraph/` — создан с нуля (новый сервис)

**Файлы:** `package.json`, `index.js`, `Dockerfile`

**Схема (Federation 2):**
```graphql
extend type Booking @key(fields: "id") {
  id: ID! @external
  promoCode: String @external
  discountPercent: Float @override(from: "booking")   # переопределяет значение из booking-subgraph
  discountInfo: DiscountInfo @requires(fields: "promoCode")
}
```

**Что делает:**
- `discountPercent @override(from: "booking")`: gateway теперь берёт discountPercent из promocode-subgraph, запрашивая актуальное значение через монолит REST (`GET /api/promos/{code}`)
- `discountInfo @requires(fields: "promoCode")`: gateway передаёт promoCode из booking в promocode-subgraph для расчёта детального DiscountInfo
- `validatePromoCode(code)`: query для прямой проверки промокода
- `activePromoCodes`: возвращает активные промокоды из монолита

### 6. `docker-compose.yml` — обновлён

**Изменения:**
- Добавлена сеть `hotelio-net: external: true` — субграфы видят `hotelio-monolith`
- Добавлена внутренняя сеть `graphql-net` для коммуникации субграфов с шлюзом
- Добавлена env `MONOLITH_URL=http://hotelio-monolith:8080` на все субграфы
- Добавлен сервис `promocode-subgraph` (port 4003)
- `restart: unless-stopped` на gateway (обработка race condition при старте)

---

## Docker PS

```
NAMES                        STATUS              PORTS
task3-apollo-gateway-1       Up                  0.0.0.0:4000->4000/tcp
task3-promocode-subgraph-1   Up                  0.0.0.0:4003->4003/tcp
task3-booking-subgraph-1     Up                  0.0.0.0:4001->4001/tcp
task3-hotel-subgraph-1       Up                  0.0.0.0:4002->4002/tcp
hotelio-monolith             Up                  0.0.0.0:8084->8080/tcp
booking-service              Up                  0.0.0.0:9090->9090/tcp
booking-history-service      Up                  0.0.0.0:8085->8080/tcp
task2-kafka-1                Up                  0.0.0.0:9092->9092/tcp
hotelio-db                   Up                  0.0.0.0:5432->5432/tcp
booking-db                   Up                  5432/tcp
booking-history-db           Up                  5432/tcp
task2-zookeeper-1            Up                  0.0.0.0:2181->2181/tcp
```

---

## Примеры запросов

### Успешный вызов (заголовок `userid: test-user-2`)

```graphql
query GetMyBookings {
  bookingsByUser(userId: "test-user-2") {
    id
    userId
    hotelId
    promoCode
    discountPercent
    hotel {
      city
      rating
      description
    }
    discountInfo {
      isValid
      originalDiscount
      finalDiscount
      description
    }
  }
}
```

**Заголовок:** `userid: test-user-2`

**Реальный ответ:**
```json
{
  "data": {
    "bookingsByUser": [
      {
        "id": "1",
        "userId": "test-user-2",
        "hotelId": "test-hotel-1",
        "promoCode": "TESTCODE1",
        "discountPercent": 10,
        "hotel": {
          "city": "Seoul",
          "rating": 4.7,
          "description": "Modern hotel in Seoul downtown with spa and skybar."
        },
        "discountInfo": {
          "isValid": true,
          "originalDiscount": 10,
          "finalDiscount": 10,
          "description": "Обычный промокод"
        }
      }
    ]
  }
}
```

### ACL Deny — userid: test-user-3 пытается читать данные test-user-2

```graphql
query {
  bookingsByUser(userId: "test-user-2") {
    id
  }
}
```

**Заголовок:** `userid: test-user-3` (или отсутствует)

**Реальный ответ:**
```json
{
  "errors": [{
    "message": "Access denied: you can only view your own bookings",
    "path": ["bookingsByUser"],
    "extensions": {
      "code": "FORBIDDEN",
      "serviceName": "booking"
    }
  }],
  "data": { "bookingsByUser": null }
}
```

---

## Логи booking-subgraph (после двух запросов)

```
✅ Booking subgraph ready at http://localhost:4001/
   Monolith URL: http://hotelio-monolith:8080
[ACL] User test-user-2 fetching bookings for userId=test-user-2
[REST] Got 1 bookings for userId=test-user-2
```

## Логи hotel-subgraph (DataLoader batching)

```
✅ Hotel subgraph ready at http://localhost:4002/
   Monolith URL: http://hotelio-monolith:8080
[DataLoader] Batching 1 hotel(s): test-hotel-1
```

> DataLoader батчит все hotel IDs из одного запроса в один вызов, предотвращая N+1.

---

## Запуск

```bash
# 1. Убедиться, что task2 запущен
cd tasks/task2
docker compose up -d

# 2. Запустить task3
cd ../task3
docker compose up -d --build

# 3. Открыть Apollo Sandbox
# http://localhost:4000
```
