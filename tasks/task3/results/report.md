# Задание 3. Личный кабинет: GraphQL Federation

## Что сделано

Федеративный GraphQL API из трёх модулей на Apollo Federation 2. Заглушки заменены вызовами реальных сервисов из задания 2.

```
клиент ──GraphQL──▶ apollo-gateway :4000
                      ├──▶ booking-subgraph :4001 ──gRPC ListBookings──▶ booking-service :9090
                      └──▶ hotel-subgraph   :4002 ──REST /api/hotels/{id}──▶ hotelio-monolith :8080
```

### booking-subgraph
- `bookingsByUser(userId)` вызывает `booking-service` по gRPC (`ListBookings`) по тому же контракту `booking.proto`, что и монолит. Дедлайн вызова — 3 с.
- Поля: `id`, `userId`, `hotelId`, `promoCode`, `discountPercent`. Дополнительно — `price`, `createdAt` и `hotel`.
- `discountPercent` изменён с `Int` на `Float`: в бронированиях скидка дробная (`double`), а `Int` упал бы на значении вроде `7.5`.
- `Booking.hotel` возвращает ссылку `{ __typename: "Hotel", id }`. Данные отеля шлюз берёт из `hotel-subgraph`. В схеме бронирований `Hotel` объявлен как `@key(fields: "id", resolvable: false)`: этот подграф отелем не владеет.
- `Booking.__resolveReference` ищет бронь только среди броней запрашивающего пользователя. Чужую бронь так получить нельзя, даже если знать её `id`.
- Ошибка gRPC превращается в `SERVICE_UNAVAILABLE` без внутренних подробностей. Подробности пишутся в лог.

### hotel-subgraph
- `Hotel.__resolveReference` и `hotelsByIds` вызывают REST монолита `GET /api/hotels/{id}`. Таймаут — 2 с, 404 превращается в `null`.
- У отеля в монолите нет полей «название» и «звёзды». `name` берётся из `description`, `stars` — округлённый `rating`. Дополнительно отдаются `rating` и `operational`.
- Кэш в пределах одного GraphQL-запроса. Шлюз присылает отели всех броней одним запросом `_entities`, и один отель повторяется много раз. Без кэша на каждую бронь уходил бы отдельный запрос в монолит. В логе видно: на 2 брони в одном отеле — один запрос.

### apollo-gateway
- Суперграф собирается из двух подграфов (`IntrospectAndCompose`).
- **Изменено вопреки подсказке «заголовки передаются автоматически».** Apollo Gateway не передаёт заголовки клиента в подграфы. Без доработки ACL отказывал бы всем запросам, потому что `userid` до подграфа не доходил. Добавлен `RemoteGraphQLDataSource`, который явно пробрасывает `userid`.
- Стек вызовов в ответах клиенту отключён (`includeStacktraceInErrorResponses: false`) и в шлюзе, и в подграфах: он раскрывает внутреннее устройство сервисов.
- `restart: on-failure`: шлюз собирает суперграф при старте и падает, если подграфы ещё не поднялись.

### ACL
Проверка в резолвере `bookingsByUser` по заголовку `userid`:

| Ситуация | Результат |
| :- | :- |
| `userid` совпадает с `userId` в запросе | Бронирования возвращаются |
| `userid` другого пользователя | `FORBIDDEN`, данных нет |
| Нет заголовка `userid` | `UNAUTHENTICATED`, данных нет |

Каждое решение ACL пишется в лог `booking-subgraph`.

Ограничение: заголовок `userid` выставляет сам клиент, то есть его можно подделать. Это допустимо только пока перед шлюзом нет API Gateway. В целевой схеме API Gateway проверяет токен пользователя, сам выставляет `userid` и удаляет пришедший от клиента.

### Docker
Все три контейнера в сети `hotelio-net` вместе с сервисами задания 2. Сначала поднимается `tasks/task2`, затем `tasks/task3`.

## Проверка

```bash
cd tasks/task2 && docker compose up -d --build
cd ../task3 && docker compose up -d --build
```

Запрос в Apollo Sandbox на http://localhost:4000/ с заголовком `userid: test-user-3`:

```graphql
query {
  bookingsByUser(userId: "test-user-3") {
    id
    promoCode
    discountPercent
    price
    hotel { name city stars }
  }
}
```

## Результаты

| Файл | Что внутри |
| :- | :- |
| [docker-ps.txt](docker-ps.txt) | Результат `docker ps` |
| [success-call.txt](success-call.txt) | Успешный вызов: свои бронирования вместе с данными отеля из второго подграфа |
| [acl-deny.txt](acl-deny.txt) | Deny по ACL: чужие бронирования (`FORBIDDEN`) и запрос без заголовка (`UNAUTHENTICATED`) |
| [subgraph-logs.txt](subgraph-logs.txt) | Логи `booking-subgraph`, `hotel-subgraph` и `apollo-gateway` после этих запросов |

Вызовы сохранены как текстовые выгрузки curl: запрос, заголовки и ответ шлюза. Те же запросы можно повторить в Apollo Sandbox на http://localhost:4000/ и снять скриншоты.
