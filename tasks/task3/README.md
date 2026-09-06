# Задание 3. Личный кабинет (GraphQL Federation)

Реализация федеративного GraphQL API (Apollo Federation) для личного кабинета Hotelio.
Субграфы обращаются к **реальным модулям Задания 2** (монолит + booking-service) по REST в общей Docker-сети `hotelio-net`.

## Модули

| Сервис | Роль | Порт |
|---|---|---|
| `apollo-gateway` | Суперграф: агрегирует схемы субграфов, проксирует запросы | 4000 |
| `booking-subgraph` | Бронирования по `userId` (источник — монолит REST → booking-service) + ACL | 4001 |
| `hotel-subgraph` | Отели: `__resolveReference`, батчинг/кеш через DataLoader (`hotelsByIds`) | 4002 |
| `promocode-subgraph` | Промокоды: `@override` поля `discountPercent`, `discountInfo @requires(promoCode)` | 4003 |

## Подготовка окружения

Субграфы ходят в монолит (`hotelio-monolith:8080`) и должны быть с ним **в одной сети**.

```bash
# 1. Поднять стек Задания 2 (монолит, booking-service, БД, Kafka) в сети hotelio-net
#    (docker network create hotelio-net — если ещё не создана)

# 2. Поднять субграфы Задания 3
docker compose up -d --build
```

> Порты наружу: Gateway 4000, booking 4001, hotel 4002, promocode 4003.

## Данные

Используются реальные данные монолита (фикстуры `test/init-fixtures.sql`):
- пользователи: `test-user-1 … test-user-3`;
- брони (созданы в задании 2): `test-user-2` (promo `TESTCODE1`), `test-user-3`;
- промокоды: `TESTCODE1` (10%), `TESTCODE-VIP`, `TESTCODE-OLD`;
- отели: `test-hotel-1 … test-hotel-3`. Монолитная модель отеля не содержит `name`/`stars`,
  поэтому в суперграфе `name = "Отель {id}"`, `stars = 5`; `city` — реальный.

## Проверка корректности

GraphQL-запрос через Playground/`curl` на `http://localhost:4000/`:

```graphql
query {
  bookingsByUser(userId: "test-user-2") {
    id
    hotel {
      name
      city
    }
    discountPercent
    discountInfo {
      isValid
      originalDiscount
      finalDiscount
      description
    }
  }
}
```

**Важно (ACL):** перед запросом добавьте заголовок `userid: test-user-2` — иначе `bookingsByUser`
вернёт пустой список (ACL на уровне запроса). Заголовки передаются из Gateway в субграфы.

Пример cURL:

```bash
curl -X POST http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -H 'userid: test-user-2' \
  -d '{"query":"{ bookingsByUser(userId:\"test-user-2\") { id discountPercent hotel { name city } discountInfo { isValid originalDiscount finalDiscount } } }"}'
```

### Deny по ACL

С чужим `userid` (или без него) данные не возвращаются:

```bash
curl -X POST http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -H 'userid: test-user-1' \
  -d '{"query":"{ bookingsByUser(userId:\"test-user-2\") { id hotel { name } } }"}'
# → { "bookingsByUser": [] }
```

## Решение проблемы N+1

В `hotel-subgraph` резолверы используют `DataLoader` (`dataloader` в package.json): все
`__resolveReference` по отелям в рамках одного запроса группируются в один батч и кешируются
по `id`. Добавлен query `hotelsByIds(ids: [ID!]!): [Hotel]!` — тот же батч через `loader.loadMany`.
В логах виден один batch (`["test-hotel-1", …]`) на несколько бронирований.

## Выделение промокодов

`promocode-subgraph` объявляет `extend type Booking @key(fields: "id")` с полями
`id @external`, `promoCode @external`. Поле `discountPercent` переопределено
(`@override(from: "booking")`) и резолвится из актуального состояния промокода в монолите
(`GET /api/promos/{code}`). `discountInfo @requires(fields: "promoCode")` — Federation сам
подтянет `promoCode` в entity-запрос, когда клиент запрашивает `discountInfo`.
