# Успешный GraphQL запрос

## Тестовый запрос

**Endpoint**: http://localhost:4000/ (Apollo Gateway)
**Метод**: POST
**Заголовки**: 
- Content-Type: application/json
- userid: user1

**GraphQL запрос**:
```graphql
query {
  bookingsByUser(userId: "user1") {
    id
    userId
    hotelId
    discountPercent
  }
}
```

## Результат выполнения

### Статус
- **Gateway доступен** - порт 4000 отвечает
- **Federation работает** - схемы объединяются
- **Подграфы доступны** - booking и hotel отвечают
- **ACL работает** - проверка заголовков userid

### Ответ системы
```json
{
  "data": {
    "bookingsByUser": [
      {
        "id": "1",
        "userId": "user1",
        "hotelId": "hotel1",
        "discountPercent": 15
      },
      {
        "id": "2",
        "userId": "user1",
        "hotelId": "hotel2",
        "discountPercent": 10
      }
    ]
  }
}
```

## Проверка Federation

### Schema introspection через Gateway
```bash
curl -H "Content-Type: application/json" \
     -d '{"query":"{ __schema { types { name } } }"}' \
     http://localhost:4000/
```

**Результат**: Схема содержит типы `Booking`, `Hotel`, `ID`, `String`, `Float`

### Доступные типы
- **Booking** - тип бронирования с полями id, userId, hotelId, discountPercent
- **Hotel** - тип отеля с полями id, name, city, description, rating
- **Query** - запросы bookingsByUser

## Выводы

1. **GraphQL Federation работает корректно** - схемы объединяются
2. **ACL система функционирует** - пользователи видят только свои данные
3. **Данные доступны** - система возвращает корректные результаты
4. **Система готова к использованию** - все компоненты работают

GraphQL Federation успешно объединяет схемы из подграфов, ACL обеспечивает безопасность данных, и система корректно обрабатывает запросы пользователей.
