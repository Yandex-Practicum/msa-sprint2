# Отчет о внесенных изменениях - Задание 3

## Описание изменений

### 1. Booking Subgraph

**Файл**: `booking-subgraph/index.js`

**Изменения**:
- Заменил заглушки на реальные вызовы к PostgreSQL базе данных
- Реализовал ACL через проверку заголовка `userid`
- Добавил `__resolveReference` для Federation
- Интегрировал с существующей базой данных `booking_service`

**Ключевые особенности**:
- Пользователь может видеть только свои бронирования
- Проверка авторизации через `req.headers['userid']`
- Ошибка 403 при попытке доступа к чужим данным
- Подключение к PostgreSQL через переменные окружения

### 2. Hotel Subgraph

**Файл**: `hotel-subgraph/index.js`

**Изменения**:
- Заменил заглушки на реальные REST API вызовы к монолиту
- Реализовал `__resolveReference` для Federation
- Добавил поддержку всех полей отеля (name, city, description, rating, amenities)

**Ключевые особенности**:
- Интеграция с существующим REST API монолита
- Автоматическое разрешение ссылок между типами
- Обработка ошибок и fallback значений

### 3. Apollo Gateway

**Файл**: `apollo-gateway/index.js`

**Изменения**:
- Настроил Federation для объединения схем
- Исправил конфигурацию для работы в Docker сети
- Добавил поддержку introspection для GraphQL Playground
- Реализовал передачу заголовков через RemoteGraphQLDataSource

**Ключевые особенности**:
- Автоматическое объединение схем из подграфов
- Поддержка `__resolveReference` для связей между типами
- GraphQL Playground доступен на порту 4000

### 4. Docker конфигурация

**Файл**: `docker-compose.yml`

**Изменения**:
- Добавил все необходимые сервисы
- Настроил правильные порты и зависимости
- Интегрировал с существующей сетью `hotelio-net`

**Сервисы**:
- `booking-subgraph` (порт 4001)
- `hotel-subgraph` (порт 4002)
- `apollo-gateway` (порт 4000)
- `hotelio-monolith-task3` (порт 8087)
- Базы данных PostgreSQL

## Технические детали

### ACL реализация
```javascript
const requestUserId = req.headers['userid'];

if (!requestUserId) {
  throw new Error('Unauthorized: userid header required');
}

if (requestUserId !== userId) {
  throw new Error('Forbidden: can only access own bookings');
}
```

### Federation конфигурация
```javascript
const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://hotelio-booking-subgraph:4001' },
    { name: 'hotel', url: 'http://hotelio-hotel-subgraph:4002' },
  ],
});
```

### Интеграция с базой данных
```javascript
const pool = new Pool({
  host: process.env.BOOKING_DB_HOST || 'localhost',
  port: process.env.BOOKING_DB_PORT || 5433,
  database: process.env.BOOKING_DB_NAME || 'booking_service',
  user: process.env.BOOKING_DB_USER || 'booking_user',
  password: process.env.BOOKING_DB_PASSWORD || 'booking_pass',
});
```

## Результаты

1. **GraphQL Federation работает** - схемы успешно объединяются
2. **ACL реализован** - пользователи видят только свои данные
3. **Интеграция с существующими сервисами** - подключается к монолиту и БД
4. **Docker контейнеризация** - все сервисы запускаются корректно
5. **GraphQL Playground доступен** - для тестирования API

## Проверка работоспособности

Система готова к тестированию через GraphQL Playground на http://localhost:4000/

**Доступные возможности**:
- Объединение схем из подграфов
- ACL контроль доступа к данным
- Интеграция с существующими REST API
- Полнофункциональный GraphQL API
