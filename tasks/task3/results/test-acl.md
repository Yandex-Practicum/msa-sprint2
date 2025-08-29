# Тестирование ACL (Access Control List)

## Описание тестов

### Тест 1: Успешный запрос с правильным userid

**Запрос** (через Apollo Gateway):
```bash
curl -H "Content-Type: application/json" \
     -H "userid: user1" \
     -d '{"query":"{ bookingsByUser(userId: \"user1\") { id userId hotelId discountPercent } }"}' \
     http://localhost:4000/
```

**Результат**: Успешный ответ с данными пользователя user1
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

### Тест 2: Запрос без заголовка userid

**Запрос**:
```bash
curl -H "Content-Type: application/json" \
     -d '{"query":"{ bookingsByUser(userId: \"user1\") { id userId hotelId discountPercent } }"}' \
     http://localhost:4000/
```

**Результат**: Ошибка "Unauthorized: userid header required"

### Тест 3: Запрос с неправильным userid

**Запрос**:
```bash
curl -H "Content-Type: application/json" \
     -H "userid: user2" \
     -d '{"query":"{ bookingsByUser(userId: \"user1\") { id userId hotelId discountPercent } }"}' \
     http://localhost:4000/
```

**Результат**: Ошибка "Forbidden: can only access own bookings"

## Результаты тестирования

### Статус ACL
- **Реализован** - проверка заголовка userid
- **Работает** - пользователь видит только свои данные
- **Безопасность** - ошибки при неправильной авторизации

### Особенности реализации
1. **Заголовок userid** передается из Gateway в подграфы
2. **Проверка авторизации** происходит на уровне GraphQL
3. **Ошибки безопасности** возвращают соответствующие сообщения
4. **Логирование** всех попыток доступа

## Выводы

ACL система работает корректно и обеспечивает безопасность данных пользователей. Apollo Gateway успешно передает заголовки авторизации к подграфам, обеспечивая полноценную защиту данных на уровне GraphQL Federation.
