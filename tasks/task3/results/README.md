# Задание 3 — результаты

Полный стек проверен вживую: `docker network create hotelio-net`, `tasks/task2` (монолит + `booking-service`) и `tasks/task3` (4 сервиса) подняты вместе через `docker compose up -d --build`, фикстуры из `tasks/task2/results/init-fixtures.sql` загружены в монолит, реальные брони созданы через `POST /api/bookings` (уходит по gRPC в `booking-service`, как и задумано в задании 2).

## Что сделано

- **booking-subgraph** — `userBookings`/`booking`/`__resolveReference` ходят не в БД напрямую, а по gRPC в `booking-service` из задания 2 (`ListBookings`). Отдельного RPC "получить бронь по id" в контракте задания 2 нет, поэтому `booking(id)` и `__resolveReference` ищут нужную бронь в списке бронирований **текущего** пользователя — это же само по себе и есть ACL: чужую бронь просто негде найти. `DataLoader` на запрос кеширует список броней по userId. Добавлено поле `hotel: Hotel` (в первой версии я его забыл — федерация без него бессмысленна, нашёл при первом же реальном прогоне golden-запроса, см. ниже).
- **hotel-subgraph** — данных об отелях отдельным сервисом нет, ходит по REST в монолит (`GET /api/hotels/{id}`). У монолитной сущности `Hotel` нет поля `name` — синтезируем читаемое имя из `id` (`test-hotel-1` → `Test Hotel 1`), остальные поля (`city`, `rating`, `description`, `operational`, `fullyBooked`) настоящие.
- **promocode-subgraph** (новый) — вынесли логику промокодов из `booking-subgraph`: переопределяет `discountPercent` (`@override(from: "booking-subgraph")`) и добавляет `discountInfo` (оба через `@requires(fields: "promoCode")`). `originalDiscount` берём из gRPC `ListBookings` (то, что было посчитано при создании брони), `finalDiscount`/`discountPercent` — пересчитываем "вживую" через `/api/promos/validate`, которым и так уже пользуется `booking-service`. `activePromoCodes` — в монолите нет листинга промокодов (только get-by-code), поэтому перебираем известный набор кодов из env `KNOWN_PROMO_CODES`.
- N+1 в **hotel-subgraph** — `DataLoader` на запрос (батчинг одинаковых `hotelId` в один "тик") плюс модульный TTL-кеш (30 сек) внутри batch-функции, который гасит повторные REST-вызовы уже между разными запросами.
- **apollo-gateway** — агрегирует три подграфа через `IntrospectAndCompose`.

## Баги, найденные и исправленные при живой проверке

1. **Заголовки не доходили до подграфов.** Заготовка гейтвея (`context: async ({ req }) => ({ req })`) создавала иллюзию, что заголовки "пробрасываются автоматически" (так и было написано в исходном README задания) — на деле `ApolloGateway` сам по себе НЕ форвардит произвольные HTTP-заголовки в подграфы, это нужно делать явно через `buildService` + `RemoteGraphQLDataSource.willSendRequest`. Без этого ACL по `userid` был бы фиктивным. Исправлено в `apollo-gateway/src/index.ts`.
2. **`@override`/`@requires` — "Unknown directive".** Директивы Federation 2 не подхватываются автоматически: нужен явный `extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: [...])` в SDL `promocode-subgraph`. Без него композиция супер-графа падала.
3. **Имя сабграфа в gateway не совпадало с `@override(from: "booking-subgraph")`.** Изначально в `apollo-gateway` подграфы были названы `booking`/`hotel`/`promocode`, а `@override` в `promocode-subgraph` ссылался на `"booking-subgraph"` — композиция падала с "targets an unknown subgraph". Переименовал подграфы в gateway в `booking-subgraph`/`hotel-subgraph`/`promocode-subgraph`.
4. **В `Booking` не было поля `hotel`.** Забыл добавить в схему `booking-subgraph` само поле `hotel: Hotel` (только `hotelId: ID!`) — без него `hotel { name city }` из golden-запроса не резолвился вообще. Добавлено: `Booking.hotel` отдаёт ссылку `{ __typename: "Hotel", id: hotelId }`, которую резолвит `hotel-subgraph` через `__resolveReference`.

Все четыре найдены и исправлены именно во время прогона реального стека — без подъёма Docker их было бы не увидеть.

## Файлы в этой папке

- **`docker-ps.txt`** — вывод `docker ps` со всеми 12 контейнерами (4 из задания 3 + 8 из задания 2) в состоянии `Up`.
- **`01-schema-composition.txt`** — интроспекция супер-графа через gateway: поля из всех трёх подграфов (включая `hotel` на `Booking` и переопределённые `discountPercent`/`discountInfo`) собраны в одной схеме.
- **`02-acl-check.txt`** — golden-запрос `userBookings` на реальных данных (брони `test-user-2` с `TESTCODE1`, отель `test-hotel-1`, посчитанная скидка) + три сценария ACL: без заголовка (deny), с чужим `userid` (deny), и контрольный — `test-user-3` видит ровно свои брони, а не чужие.
- **`03-n-plus-one.txt`** — 3 бронирования на один и тот же отель → ровно один вызов batch-функции `DataLoader` и один REST-запрос к монолиту (а не три).
- **`booking-subgraph-logs.txt`** — логи `booking-subgraph` (контейнер перезапущен для чистого лога) после ровно двух запросов через gateway: один с корректным `userid` (ACL OK → реальный вызов gRPC `ListBookings`, ответ "3 бронирования"), второй без заголовка (ACL DENY, до gRPC дело не доходит).
- **`screenshot-success.png`** — скриншот (headless Chrome) страницы, которая реальным `fetch()` из браузера бьёт в живой `http://localhost:4000/` с заголовком `userid: test-user-2` и показывает успешный ответ. Это не Apollo Sandbox (тому нужны внешние iframe-виджеты apollographql.com, автоматизировать через них — отдельная возня), а прямой честный вызов из браузера к реально работающему gateway с реальным ответом.
- **`screenshot-acl-deny.png`** — тот же приём: браузер бьёт в gateway с `userid: test-user-3`, запрашивая брони `test-user-2` — получает `userBookings: []`.

## Запуск для проверки

```bash
docker network create hotelio-net   # Создать сеть
cd tasks/task2 && docker compose up -d --build
# Добавляем mock данные в БД монолита
docker exec -i hotelio-db psql -U hotelio -d hotelio < tasks/task2/results/init-fixtures.sql
# Запросы для бронирования:
curl -X POST "http://localhost:8084/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1"
curl -X POST "http://localhost:8084/api/bookings?userId=test-user-3&hotelId=test-hotel-1"

cd ../task3 && docker compose up -d --build
```

Дальше — curl запрос `tasks/task3/README.md` с заголовком `userid: test-user-2` на `http://localhost:4000/`.
