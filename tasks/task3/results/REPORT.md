# Task 3 - GraphQL Federation: отчет об изменениях

## Реализованные сервисы

### booking-subgraph (порт 4001)
- Заменены заглушки на реальные вызовы к `GET /api/bookings?userId=` монолита.
- Добавлено поле `hotel: Hotel` — возвращает федеративную ссылку `{ __typename, id }`, которую gateway разрешает через hotel-subgraph.
- Реализован ACL: `bookingsByUser` проверяет заголовок `userid` и возвращает `FORBIDDEN`, если он не совпадает с запрошенным `userId`.
- Добавлен resolver `booking(id)` с аналогичной проверкой владельца.

### hotel-subgraph (порт 4002)
- Заменены заглушки на реальные вызовы к `GET /api/hotels/{id}` монолита.
- Обновлена схема: поля `city`, `rating`, `description` (соответствуют сущности `Hotel` монолита).
- Добавлен `dataloader` в `package.json`.
- Решена проблема N+1: `DataLoader` создается per-request в `context`. При запросе списка бронирований все вызовы `__resolveReference` для одинаковых `hotelId` батчатся в один тик и дедуплицируются — вместо N последовательных запросов к монолиту.

### promocode-subgraph (порт 4003) — новый сервис
- Создан новый подграф для управления промокодами.
- Расширяет тип `Booking` из booking-subgraph:
  - `discountPercent @override(from: "booking")` — поле переопределено и теперь резолвится здесь (проверенное значение из `GET /api/promos/{code}`).
  - `discountInfo @requires(fields: "promoCode")` — gateway сначала получает `promoCode` из booking-subgraph, затем передает его в этот резолвер.
- Запросы: `validatePromoCode(code)`, `activePromoCodes`.
- Использует Federation v2 (`@link`, `@override`, `@requires`, `@external`).

### gateway (порт 4000)
- Заменен устаревший `serviceList` на `IntrospectAndCompose` (Federation v2).
- Добавлен `ForwardHeadersDataSource` — все заголовки входящего запроса (в т.ч. `userid` для ACL) пробрасываются в каждый подграф.
- Добавлен `promocode-subgraph` в список подграфов.

### docker-compose.yml
- Добавлен сервис `promocode-subgraph` на порту `4003`.
- Все сервисы переведены на сеть `hotelio-net` (external) для доступа к `hotelio-monolith`.
- Добавлена переменная окружения `MONOLITH_URL` во все подграфы.

## Пример запроса

```graphql
# Заголовок: userid: test-user-2
query {
  bookingsByUser(userId: "test-user-2") {
    id
    hotel { city rating }
    promoCode
    discountPercent        # из promocode-subgraph (@override)
    discountInfo {
      isValid
      finalDiscount
      description
    }
  }
}
```
