# Отчёт - Задание 3. Личный кабинет (GraphQL Federation)

## Суть изменения

Для личного кабинета пользователя (агрегация бронирований + отелей + промокодов)
команда перешла на **BFF через Apollo Federation**. Вместо множества REST/gRPC
вызовов на фронтенде теперь один GraphQL-суперграф, объединяющий три субграфа:

- `booking-subgraph` - бронирования (реальные gRPC-вызовы, ACL);
- `hotel-subgraph` - отели (REST монолита, `__resolveReference` + DataLoader);
- `promocode-subgraph` - промокоды (мигрированный домен, `@override`).

Эти субграфы обращаются к реальным сервисам из заданий 1-2
(`hotelio-monolith`, `hotelio-booking-service`) через общую сеть `hotelio-net`.

```
CLIENT (GraphQL, header userid)
 │
 
apollo-gateway :4000 (ApolloGateway, суперграф из 3 сабграфов)
 ├── booking-subgraph :4001 ──gRPC── hotelio-booking-service :9090
 ├── hotel-subgraph :4002 ──REST(batch)── hotelio-monolith :8080 (/api/hotels/by-ids)
 └── promocode-subgraph:4003 ──REST(read)─── hotelio-monolith :8080 (/api/bookings)
```

---

## Что реализовано

### 1. booking-subgraph (gRPC + ACL)
- Описывает `type Booking @key(fields: "id")` со всеми полями: `id, userId,
 hotelId, promoCode, discountPercent, checkIn, checkOut, status`.
- Заглушки заменены реальными вызовами: используется gRPC-клиент
 (`@grpc/grpc-js` + `proto-loader`) к сервису `booking-service:9090`
 (прото-контракт скопирован в `booking-subgraph/proto/booking.proto`).
 `userBookings(userId)`/`bookingsByUser(userId)` читают `ListBookings`.
- ACL: в резолверах проверяется заголовок `userid`:
 - заголовок отсутствует → `FORBIDDEN: header userid is required`;
 - `userid` "не равно" запрашиваемый `userId` → `FORBIDDEN: user 'X' cannot access
 bookings of 'Y'`;
 - только свой пользователь видит свои бронирования (в т.ч. `booking(id)`).

### 2. hotel-subgraph (внешний API + `__resolveReference` + N+1)
- `type Hotel @key(fields: "id")`: `id, name, city, stars, rating, description,
 operational, address`.
- `booking.hotel` и `__resolveReference` ходят в REST монолита
 `GET /api/hotels/by-ids?ids=...` (batch-эндпоинт добавлен в монолит).
- Решение N+1: на запрос создаётся один `DataLoader`; все `__resolveReference`
 внутри одного тика группируются в один batch REST-вызов, кеш DataLoader
 отдаёт повторные `id` без запросов. `Query.hotelsByIds` - точковая batch-точка.
 Бенчмарк: 6 бронирований с `hotel { name }` - 1 запрос к монолиту.

### 3. promocode-subgraph (миграция + `@override`)
- Домен промокодов вынесен из booking в отдельный сабграф: типы Booking
 расширены, данные промокодов (`TESTCODE1`, `TESTCODE-VIP`, `SUMMER`, `SPRING`,
 `TESTCODE-OLD`) живут в собственном хранилище сабграфа. Миграция - «как есть»:
 `TESTCODE1` = 10% в монолите - в промо-сервисе актуальные правила кампании 25%.
- `discountPercent: Float! @override(from: "booking-subgraph")` - актуальная
 скидка теперь резолвится promocode-subgraph (учитывает активность/актуальность
 кода и ограничения по отелям), а не значением из БД бронирований.
- `discountInfo: DiscountInfo @requires(fields: "promoCode")`:
 `originalDiscount` берётся из booking (REST-фасад `/api/bookings` из задания 2),
 `finalDiscount` считается по правилам промо-сервиса. Для запроса:
 `originalDiscount=10 → finalDiscount=25`.
- `validatePromoCode(code, hotelId)` и `activePromoCodes` - примеры.

### 4. apollo-gateway
- Композиция трёх субграфов в суперграф. Заголовок `userid` из запроса клиента
 пробрасывается в сабграфы.

---

## Итоговые проверки

| № | Проверка | Результат |
|---|----------|-----------|
| 1 | Успешный запрос личного кабинета (`userid: user1`) | `response-success.json` - 6 бронирований + отели + переопределённая скидка |
| 2 | ACL Deny: без заголовка `userid` | `response-acl-deny.json` - `FORBIDDEN: header userid is required` |
| 3 | ACL Deny: чужой пользователь (`user2` спрашивает `user1`) | `response-acl-deny-wronguser.json` - `FORBIDDEN: user 'user2' cannot access...` |
| 4 | `@override discountPercent` | брон. 11: `promoCode=TESTCODE1`, `discountPercent=25`, `discountInfo{orig=10, final=25}` |
| 5 | N+1: 6 отелей в одном запросе | `n1-batching.txt` - 1 batch REST-вызов вместо 6 |
| 6 | docker ps | `docker-ps.txt` |
| 7 | Логи сабграфов после двух запросов | `logs/*.log` |

---

## Состав

- `docker-ps.txt` - список контейнеров (монолит, booking-service, kafka + 4 task3).
- `logs/request-success.txt` + `response-success.json` - успешный вызов.
- `logs/request-acl-deny.txt` + `response-acl-deny.json`,
 `request-acl-deny-wronguser.txt` + `response-acl-deny-wronguser.json` - Deny по ACL.
- `logs/` - N+1-бенчмарк `n1-batching.txt`.
- `logs/` - логи `booking-subgraph` (2 gRPC-вызова), `hotel-subgraph`,
 `promocode-subgraph`, `apollo-gateway`.

---