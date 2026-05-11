# Задание 3: GraphQL Federation

## Сделано

1. **Booking Subgraph**
    - Реализован GraphQL subgraph на Apollo Federation
    - Добавлен gRPC клиент для связи с booking-service
    - Реализован ACL: проверка заголовка `userid`, пользователь видит только свои бронирования

2. **Hotel Subgraph**
    - Реализован GraphQL subgraph для отелей
    - Расширен тип Booking полем hotel через `extend type`

3. **Apollo Gateway**
    - Объединяет booking и hotel subgraph
    - Проксирует заголовки запросов в subgraph
    - Порт: 4000

4. **Docker**
    - Все сервисы объединены в сети `hotelio-net`
    - Booking subgraph подключен к booking-service и Kafka через общую сеть

## Проверка

```bash
curl --request POST \
  --header 'content-type: application/json' \
  --header 'userid: user-123' \
  --url http://localhost:4000/ \
  --data '{"query":"query { bookingsByUser(userId: \"user-123\") { id userId hotelId promoCode discountPercent hotel { name city } } }"}'