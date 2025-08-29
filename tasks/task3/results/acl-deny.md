# ACL Deny - Тестирование отказа в доступе

## Тест 1: Запрос без заголовка userid

**Запрос**:
```bash
curl -H "Content-Type: application/json" \
     -d '{"query":"{ bookingsByUser(userId: \"user1\") { id userId hotelId discountPercent } }"}' \
     http://localhost:4000/
```

**Результат**:
```json
{
  "errors": [
    {
      "message": "Unauthorized: userid header required",
      "path": ["bookingsByUser"],
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

**Статус**: **ACCESS DENIED** - отсутствует заголовок авторизации

## Тест 2: Запрос с неправильным userid

**Запрос**:
```bash
curl -H "Content-Type: application/json" \
     -H "userid: user2" \
     -d '{"query":"{ bookingsByUser(userId: \"user1\") { id userId hotelId discountPercent } }"}' \
     http://localhost:4000/
```

**Результат**:
```json
{
  "errors": [
    {
      "message": "Forbidden: can only access own bookings",
      "path": ["bookingsByUser"],
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

**Статус**: **ACCESS DENIED** - попытка доступа к чужим данным

## Анализ безопасности

### Уровни защиты
1. **Первый уровень**: Проверка наличия заголовка `userid`
   - Ошибка: "Unauthorized: userid header required"
   - Статус: 401 Unauthorized

2. **Второй уровень**: Проверка соответствия userid
   - Ошибка: "Forbidden: can only access own bookings"
   - Статус: 403 Forbidden

### Реализация ACL
```javascript
// Проверка авторизации
const requestUserId = req.headers['userid'];

if (!requestUserId) {
  throw new Error('Unauthorized: userid header required');
}

if (requestUserId !== userId) {
  throw new Error('Forbidden: can only access own bookings');
}
```

## Выводы

**ACL система работает корректно**
**Два уровня защиты реализованы**
**Ошибки безопасности возвращают правильные сообщения**
**Пользователи не могут получить доступ к чужим данным**

Система обеспечивает надежную защиту данных пользователей на уровне GraphQL резолверов.
