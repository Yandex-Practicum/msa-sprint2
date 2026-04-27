# Task 3 report

## Что сделано

Реализован федеративный GraphQL API для личного кабинета Hotelio:

- `booking-subgraph`:
  - возвращает бронирования по `userId`;
  - поддерживает `bookingsByUser`, `userBookings`, `booking`;
  - читает данные через REST API монолита, который в task2 проксирует booking-логику в `booking-service`;
  - реализует ACL: заголовок `userid` должен совпадать с аргументом `userId`;
  - связывает `Booking.hotel` с сущностью `Hotel`.

- `hotel-subgraph`:
  - возвращает отели по ID;
  - поддерживает `__resolveReference`;
  - реализует `hotelsByIds(ids: [ID!]!)`;
  - использует `DataLoader` для батчинга и кеширования загрузки отелей.

- `promocode-subgraph`:
  - выделяет промокоды в отдельный сабграф;
  - добавляет `DiscountInfo`;
  - реализует `validatePromoCode` и `activePromoCodes`;
  - переопределяет `Booking.discountPercent` через `@override(from: "booking-subgraph")`;
  - добавляет `Booking.discountInfo`.

- `apollo-gateway`:
  - агрегирует `booking-subgraph`, `hotel-subgraph`, `promocode-subgraph`;
  - прокидывает заголовок `userid` в подграфы.

## Проверка

Успешный запрос сохранен в `successful-call.txt`.

ACL deny сохранен в `acl-deny.txt`: при `userid: test-user-3` и запросе `userId: test-user-2` возвращается пустой список.

Запрос из условия с `userid: user1` сохранен в `example-user1-call.txt`; в текущих реальных фикстурах для `user1` бронирований нет, поэтому ответ пустой. Демо-набор используется только как аварийный fallback, если REST API монолита недоступен; пустой ответ от реального API больше не подменяется демо-данными.

## Запуск

```bash
cd tasks/task3
docker compose up -d --build
```

Если запущено окружение task2 в сети `hotelio-net`, подграфы используют реальные REST-вызовы к `hotelio-monolith:8080`. Если внешние сервисы недоступны, подграфы возвращают демо-данные только как fallback для базовой проверки GraphQL и ACL.

## Пример GraphQL

```graphql
query {
  bookingsByUser(userId: "test-user-2") {
    id
    userId
    hotel {
      name
      city
    }
    promoCode
    discountPercent
    discountInfo {
      isValid
      finalDiscount
      description
    }
  }
}
```

Headers:

```json
{
  "userid": "test-user-2"
}
```
