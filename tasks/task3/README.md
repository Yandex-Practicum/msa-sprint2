## 🛠️ Подготовка окружения

Подграфы ходят за реальными данными в монолит (REST) и в `booking-service` из задания 2 (gRPC), поэтому перед запуском задания 3 должны быть подняты монолит и `booking-service` на общей сети `hotelio-net`:

```bash
docker network create hotelio-net   # если сеть ещё не создана

cd tasks/task2
docker compose up -d --build        # монолит + booking-service (+ Kafka-цепочка)
```

Дальше поднимаем само задание 3:

```bash
cd tasks/task3
docker compose up -d --build
```

Сервисы:
- `apollo-gateway` — http://localhost:4000
- `booking-subgraph` — http://localhost:4001 (gRPC-клиент к `booking-service:9090`)
- `hotel-subgraph` — http://localhost:4002 (REST-клиент к монолиту, `hotelsByIds` + `__resolveReference` с DataLoader)
- `promocode-subgraph` — http://localhost:4003 (REST-клиент к монолиту + gRPC-клиент к `booking-service`)

---

## 🚀 Проверка корректности
Поднимите контейнер GrpahQL Playground 

```
docker run -d -p 4040:4000     imega/graphql-playground:latest
```
Выполните запрос на http://localhost:4040/graphql:

```graphql
query {
  userBookings(userId: "test-user-2") {
    id
    promoCode
    hotel {
      name
      city
    }
    discountPercent
    discountInfo {
      isValid
      originalDiscount
      finalDiscount
      description
    }
  }
}
```

Данные берутся из фикстур задания 2 (`tasks/task2/results/init-fixtures.sql`) — там у `test-user-2` есть бронь с промокодом `TESTCODE1`.

Промокоды и отели отдельно:
```graphql
query {
  validatePromoCode(code: "TESTCODE1") { isValid originalDiscount finalDiscount description }
  activePromoCodes { isValid description finalDiscount }
  hotelsByIds(ids: ["test-hotel-1", "test-hotel-2"]) { id name city rating }
}
```

---

## 📌 Подсказки / решения

- Все заголовки передаются из Gateway в подграфы автоматически.
- Для реализации ACL проверяйте req.headers['userid'] в резолверах.
- Если пользователь не авторизован, не возвращайте бронирование.
- При использовании реальных модулей не забудьте использовать одну и ту же сеть в docker!

## Решение
- Отчет о выполнении задания находится в  `tasks/task3/results/`.
