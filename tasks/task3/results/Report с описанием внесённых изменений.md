# Report

## Что было сделано

В задании реализован federated GraphQL API на Apollo Federation.

### Реализованные модули
- booking-subgraph
- hotel-subgraph
- promocode-subgraph
- gateway

## booking-subgraph
В booking-subgraph реализованы:
- запрос `bookingsByUser(userId: String!)`
- запрос `bookingById(id: ID!)`
- ACL по заголовку `userid`
- интеграция с внешним REST-сервисом из задания 2
- federation-связь с типом `Hotel`

Пользователь может получать только свои бронирования.
Если `userid` отсутствует или не совпадает с `userId`, данные не возвращаются.

## hotel-subgraph
В hotel-subgraph реализованы:
- тип `Hotel`
- запрос `hotelsByIds(ids: [ID!]!)`
- `__resolveReference`
- DataLoader для батчинга и кеширования

Это устраняет проблему N+1 при запросе списка бронирований с информацией об отелях.

## promocode-subgraph
Создан отдельный `promocode-subgraph`, который:
- переопределяет поле `discountPercent` через `@override`
- добавляет поле `discountInfo`
- реализует запросы `validatePromoCode` и `activePromoCodes`

## gateway
В gateway:
- агрегированы booking, hotel и promocode сабграфы
- заголовок `userid` пробрасывается в подграфы

## Проверка
Проверены:
- успешный запуск контейнеров через Docker Compose
- успешный GraphQL-запрос через gateway
- deny по ACL
- работа federation между booking-subgraph, hotel-subgraph и promocode-subgraph
EOF