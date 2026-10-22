# Задание 3. Личный кабинет на GraphQL Federation

## Что сделал

booking-subgraph. Вместо заглушки bookingsByUser ходит в booking-service из задания 2 по gRPC (ListBookings), proto скопировал рядом. ACL простой: заголовок userid должен совпадать с userId в запросе. Если заголовка нет или он чужой, возвращается ошибка Access denied (FORBIDDEN), бронирования не отдаются. В Booking добавил поле hotel, оно ссылается на отель из hotel-subgraph по hotelId.

hotel-subgraph. __resolveReference и hotelsByIds берут отель из монолита через GET /api/hotels/{id}. В монолите у отеля нет полей name и stars, поэтому в name отдаю description, а в stars округленный rating.

gateway. Тут пришлось поправить. В подсказке написано, что заголовки пробрасываются в подграфы сами, но у меня в booking-subgraph приходил userid=undefined и ACL всем отказывал. Добавил RemoteGraphQLDataSource, который передает userid дальше.

docker-compose. Все три сервиса подключил к сети hotelio-net, чтобы они видели монолит и booking-service.

## Проверка

Сначала поднять задание 2 (монолит и booking-service) и залить тестовые данные. Для user1 из примера в задании данных нет, в фикстурах пользователи test-user-*, поэтому проверял на test-user-2.

```bash
cd tasks/task3 && docker compose up -d --build
```

Запрос на http://localhost:4000/ с заголовком userid: test-user-2

```graphql
query {
  bookingsByUser(userId: "test-user-2") {
    id
    hotel { name city }
    discountPercent
  }
}
```

С userid: test-user-3 или без заголовка приходит Access denied.

Ответы и логи подграфов лежат в local-run.log.
