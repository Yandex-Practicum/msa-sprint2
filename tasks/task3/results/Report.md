# Задание 3. Личный кабинет - GraphQL Federation

## Внесённые изменения

### Структура (`tasks/task3/`)

| Каталог | Роль |
|---|---|
| `apollo-gateway/` | Суперграф Apollo Federation (порт 4000) |
| `booking-subgraph/` | Бронирования + ACL (порт 4001) |
| `hotel-subgraph/` | Отели, DataLoader-батчинг (порт 4002) |
| `promocode-subgraph/` | **новый** субграф промокодов, `@override` discountPercent (порт 4003) |
| `docker-compose.yml` | 4 модуля в общей сети `hotelio-net` (external) |

Субграфы обращаются к **реальным модулям Задания 2** (монолит REST => booking-service через gRPC-прокси монолита) в общей Docker-сети `hotelio-net`.

### 1. `booking-subgraph`
- Реальная загрузка броней: `GET {MONOLITH_URL}/api/bookings?userId=…` (монолит проксирует список в gRPC `booking-service`, т.е. приходят данные нового booking-сервиса).
- **ACL на уровне запроса**: `bookingsByUser(userId)` возвращает данные только если заголовок `userid` совпадает с запрошенным `userId`, иначе `[]`.
- `Booking.hotel` отдаёт reference `{ __typename: "Hotel", id: hotelId }` - наполняет hotel-subgraph.

### 2. `hotel-subgraph`
- Реальная загрузка отелей: `GET /api/hotels/{id}` у монолита через `DataLoader`.
- `__resolveReference` + `hotelsByIds(ids)` через один DataLoader => **решение N+1**: все обращения к отелям в одном запросе группируются в один батч и кешируются.
- Монолитная модель отеля не содержит `name`/`stars`, поэтому для отображения формируется `name = "Отель {id}"`, `stars = 5`; `city` - реальный из монолита (см. test-log: `city: "Seoul"`).

### 3. `apollo-gateway`
- Агрегирует booking, hotel и promocode в суперграф.
- **Проброс заголовков**: `RemoteGraphQLDataSource.willSendRequest` копирует заголовок `userid` из клиентского запроса в запросы к субграфам (иначе ACL не получает его - проверено, без этого header терялся).

### 4. `promocode-subgraph` (новый, выделение промокодов)
- `extend type Booking @key(fields: "id")`, поля `id @external`, `promoCode @external`.
- `discountPercent: Float @requires(fields: "promoCode") @override(from: "booking")` - в суперграфе поле резолвится из промокодов по реальному состоянию (`GET /api/promos/{code}`).
- `discountInfo: DiscountInfo @requires(fields: "promoCode")` - `isValid/originalDiscount/finalDiscount/description/expiresAt/applicableHotels`.
- Запросы `validatePromoCode(code, hotelId)`, `activePromoCodes`.

## Проверка корректности

Выполнено через Gateway `http://localhost:4000/` (стек Задания 2 поднят в сети `hotelio-net`):

1. **OK по ACL** - `userid: test-user-2` + `bookingsByUser(userId:"test-user-2")` => реальная бронь id=2, `hotel { name city }` = «Отель test-hotel-1 / Seoul», `discountPercent=10` (переопределён из promocode: промокод TESTCODE1), `discountInfo.isValid=true`. => `test-log.txt`, `screenshot-ok.png`.
2. **Deny по ACL** - `userid: test-user-1` (чужой) запрашивает `test-user-2` => `{ "bookingsByUser": [] }`; без заголовка => `[]`. => `test-log.txt`, `screenshot-deny.png`.
3. **`@override`** - discountPercent=10 для брони с TESTCODE1 резолвится в promocode-subgraph (лог `Booking.discountPercent(promoCode=TESTCODE1) -> 10`).
4. **DataLoader** - в логах hotel-subgraph один `batch load ["test-hotel-1","test-hotel-2"]` на `hotelsByIds` с двумя id.
5. Собственные брони пользователей: `test-user-3` (VIP, без промо) => discountPercent=0.

## Файлы результатов

- `Report` - этот файл
- `docker-ps.txt` - контейнеры стека task3 (4 сервиса в сети hotelio-net)
- `screenshot-ok.png` - успешный вызов с реальными данными
- `screenshot-deny.png` - Deny по ACL
- `test-log.txt` - текстовые ответы всех запросов
- `booking-subgraph-logs.txt` / `hotel-subgraph-logs.txt` / `promocode-subgraph-logs.txt` - логи субграфов (ACL deny, batch-загрузка отелей, резолв промокодов)
