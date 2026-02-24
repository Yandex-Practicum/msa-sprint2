## Что было изменено

1. Добавлен новый сабграф `promocode-subgraph`:
- вынесена логика промокодов;
- добавлены `validatePromoCode` и `activePromoCodes`;
- реализован `discountInfo`;
- поле `Booking.discountPercent` переопределено через `@override(from: "booking-subgraph")`.

2. Обновлен `booking-subgraph`:
- расширена модель `Booking` (`checkIn`, `checkOut`, `status`, `discountPercent: Float!`);
- добавлены запросы `userBookings(userId: ID!)` и `booking(id: ID!)`;
- сохранена ACL-проверка по заголовкам `x-user-id` / `x-role`;
- связь `Booking.hotel` оставлена federated reference.

3. Обновлен `hotel-subgraph`:
- добавлен `Query.hotelsByIds(ids: [ID!]!): [Hotel]!`;
- реализован DataLoader для батчинга и кеширования;
- `__resolveReference` переведен на загрузку через DataLoader.

4. Обновлен `gateway`:
- подключены три сабграфа: `booking-subgraph`, `hotel-subgraph`, `promocode-subgraph`;
- настроен проброс заголовков ACL (`x-user-id`, `x-role`, `userid`).

5. Обновлен `docker-compose.yml`:
- добавлен сервис `promocode-subgraph`;
- добавлена зависимость gateway от него.

## Проверка

- Успешный вызов: см. `success-call.png`
- Deny по ACL: см. `acl-deny.png`
- Состояние контейнеров: `docker-ps.txt`
- Логи booking-subgraph: `booking-subgraph-logs.txt`
