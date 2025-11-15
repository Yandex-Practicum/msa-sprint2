# Report: внесённые изменения (Task 3 — GraphQL Federation / Личный кабинет)

## Коротко
Собран federated GraphQL c тремя модулями:
- **booking-subgraph** — отдает бронирования пользователя и применяет ACL.
- **hotel-subgraph** — отдает описание отеля и резолвит ссылку из бронирования.
- **apollo-gateway** — агрегирует схемы и проксирует запросы в подграфы.

Сервисная логика выполнена **на заглушках** (без внешних API), упор на корректную федерацию и ACL.

---

## Изменения по компонентам

### 1) booking-subgraph

* **Заглушки данных** - Локальный массив `stubBookings` (3 записи).

* **ACL**
  * Читаем заголовок `userid` из `context.req.headers`.
  * Если заголовка нет, выдаём `GraphQLError('Unauthorized', code: UNAUTHENTICATED)`.
  * Если `userid` ≠ аргументу `userId`, выдаём пустой список (запрет на чужие бронирования).

* **Федерация**
  * Поле `Booking.hotel` возвращает ссылку вида `{ __typename: 'Hotel', id }` для последующего резолва в `hotel-subgraph`.

* **Логирование** - Подключен плагин `loggingPlugin`:
  * Логирует входящий `userid`, переменные запроса, результат (`allow/deny`) и ошибки.
  * Просмотр: `docker compose logs -f booking-subgraph`.

### 2) hotel-subgraph

* **Заглушки данных** - Простейший словарь `{id -> {name, city}}` для `hotel-777` и `hotel-888`.

* **Федерация** - Реализован `__resolveReference` по `id`, чтобы поле `Booking.hotel` корректно заполнялось.

### 3) apollo-gateway

* **Агрегация схем** - Настроен Gateway со списком сервисов:
  * `booking-subgraph` → `http://booking-subgraph:4001/graphql`
  * `hotel-subgraph` → `http://hotel-subgraph:4002/graphql`

* **Проксирование заголовков**
  Заголовок `userid` пробрасывается в подграфы (нужен для ACL).

---

## Docker / сборка

### docker-compose.yml

* Запускает 3 контейнера (`apollo-gateway`, `booking-subgraph`, `hotel-subgraph`) на портах `4000`, `4001`, `4002`.
* В окружении задаётся `NODE_ENV=production`.

---

## Ограничения и дальнейшие шаги (To-Do)

* Заглушки заменить на реальные вызовы (REST/gRPC) из предыдущего задания.
* Вынести аутентификацию в API Gateway/общий Auth-сервис; передавать `userid` как доверенный клейм.
* Добавить трассировку и метрики (Apollo usage reporting / OTEL).
* Покрыть критичные резолверы тестами (ACL/ошибки/поля).
