# Задание 3 — отчёт о внесённых изменениях

## Что сделано

1. **apollo-gateway** ([gateway/index.js](../gateway/index.js))  
   - В `serviceList` добавлен подграф `promocode` (`http://promocode-subgraph:4003`).  
   - Для всех подграфов используется `RemoteGraphQLDataSource` с `willSendRequest`: заголовок **`userid`** с клиента копируется в запросы к подграфам (ACL на стороне booking).

2. **booking-subgraph**  
   - Federation v2.3: `@link`, `@key`, `@shareable` на `discountPercent` (базовое значение из источника данных).  
   - Поле **`hotel`**: ссылка на сущность `Hotel` через `{ __typename: 'Hotel', id: hotelId }`, заглушка `Hotel @key(resolvable: false)`.  
   - Данные: gRPC `ListBookings` ([booking.proto](../booking-subgraph/booking.proto)), адрес `BOOKING_GRPC_URL`; без переменной — локальная заглушка (как в условии).  
   - **ACL**: `bookingsByUser` и `booking(id)` возвращают данные только если `req.headers.userid` совпадает с запрошенным пользователем / владельцем брони.

3. **hotel-subgraph**  
   - `GET {MONOLITH_BASE_URL}/api/hotels/{id}`; без `MONOLITH_BASE_URL` — моки.  
   - **DataLoader** на запрос: дедупликация id, параллельные fetch, `hotelsByIds` и `__resolveReference` используют один и тот же loader.  
   - Поля `name` / `stars` маппятся из JSON монолита (`description`, `rating`).

4. **promocode-subgraph** (новый сервис, порт **4003**)  
   - `extend type Booking` с `discountPercent @override(from: "booking")` и `discountInfo @requires(fields: "promoCode")`.  
   - Тип `DiscountInfo`, запросы `validatePromoCode`, `activePromoCodes`.  
   - Загрузка строк бронирования: один gRPC `ListBookings` с пустым `user_id` на батч (внутренняя сеть) + **DataLoader** по `id` бронирования.

5. **docker-compose**  
   - Сервис `promocode-subgraph`, общая внешняя сеть **`hotelio-net`** (как в task2) для связи с монолитом и `booking-service`.  
   - Переменные: `BOOKING_GRPC_URL`, `MONOLITH_BASE_URL` (можно задать в shell или `.env` рядом с compose).

## Как запускать

```bash
docker network create hotelio-net   # один раз, если сети ещё нет
cd tasks/task2 && docker compose up -d --build   # опционально: монолит + gRPC booking
cd tasks/task3
BOOKING_GRPC_URL=hotelio-booking-service:9090 MONOLITH_BASE_URL=http://hotelio-monolith:8080 docker compose up -d --build
```

Только task3 (без task2): поднимите `hotelio-net`, не задавайте `BOOKING_GRPC_URL` и `MONOLITH_BASE_URL` — сработают заглушки.

## Проверочный запрос (Playground / curl)

Заголовок: **`userid: user1`** (должен совпадать с `userId` в запросе).

```graphql
query {
  bookingsByUser(userId: "user1") {
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
    }
  }
}
```

ACL: без заголовка `userid` или при несовпадении с `userId` список бронирований пустой.

## Артефакты в results/

| Файл | Назначение |
|------|------------|
| `docker-ps.txt` | вывод `docker ps` после успешного запуска (обновить локально) |
| `screenshot-success.txt` | описание: приложить скрин успешного запроса с заголовком |
| `screenshot-acl-deny.txt` | описание: скрин отказа ACL |
| `booking-subgraph.log` | фрагмент логов после 2+ запросов (или `docker compose logs booking-subgraph`) |

Скриншоты удобно сохранить как `screenshot-success.png` / `screenshot-acl-deny.png` в этой же папке.
