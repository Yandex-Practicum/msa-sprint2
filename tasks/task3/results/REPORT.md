# Отчёт о выполнении Task 3: GraphQL Federation для личного кабинета Hotelio

## 📋 Описание задания
Реализовать федеративный GraphQL API с использованием Apollo Federation для личного кабинета Hotelio, включающий:
- booking-subgraph для работы с бронированиями 
- hotel-subgraph для работы с отелями
- apollo-gateway для агрегации схем
- ACL для защиты данных пользователей

## ✅ Выполненные изменения

### 1. **booking-subgraph** 
#### Файл: `booking-subgraph/index.js`
- ✅ Подключение к PostgreSQL БД booking-db для прямого доступа к данным
- ✅ Интеграция с gRPC сервисом BookingService (booking-service:9090)
- ✅ Реализация ACL проверки через заголовок `userid`
- ✅ Federation схема с типом Booking и reference на Hotel
- ✅ Fallback на заглушки при недоступности сервисов

**Ключевые изменения:**
```javascript
// ACL проверка
const requestUserId = req.headers['userid'];
if (!requestUserId) {
  throw new Error('Unauthorized: userid header required');
}
if (requestUserId !== userId) {
  return []; // Пустой массив при попытке доступа к чужим данным
}
```

### 2. **hotel-subgraph**
#### Файл: `hotel-subgraph/index.js`
- ✅ Интеграция с REST API монолита (http://monolith:8080)
- ✅ Реализация __resolveReference для федерации
- ✅ Расширение типа Booking полем hotel через @requires
- ✅ Кэширование данных отелей для оптимизации
- ✅ Обогащение данных недостающими полями

**Ключевые изменения:**
```javascript
// Federation resolver
extend type Booking @key(fields: "id") {
  id: ID! @external
  hotelId: String! @external
  hotel: Hotel @requires(fields: "hotelId")
}
```

### 3. **apollo-gateway**
#### Файл: `gateway/index.js`
- ✅ Настройка RemoteGraphQLDataSource для передачи заголовков
- ✅ Реализация AuthenticatedDataSource для прокидывания userid
- ✅ Интеграция обоих subgraphs в единый суперграф
- ✅ CORS настройки для тестирования

**Ключевые изменения:**
```javascript
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Передаем все заголовки от клиента к subgraphs
    if (context.req && context.req.headers) {
      Object.keys(context.req.headers).forEach(key => {
        request.http.headers.set(key, context.req.headers[key]);
      });
    }
  }
}
```

### 4. **Docker интеграция**
#### Файл: `docker-compose.yml`
- ✅ Все сервисы подключены к сети hotelio-net
- ✅ Настроены environment переменные для подключения к БД и сервисам
- ✅ Правильный порядок зависимостей между сервисами

### 5. **Зависимости**
#### Обновленные package.json:
- booking-subgraph: добавлены @grpc/grpc-js, @grpc/proto-loader, pg
- hotel-subgraph: добавлен node-fetch
- gateway: уже содержал необходимые зависимости

## 🧪 Результаты тестирования

### ✅ Успешные тесты:

1. **Запрос с правильным userid заголовком:**
```json
{
  "data": {
    "bookingsByUser": [{
      "id": "booking_1756138453375376512",
      "userId": "test-user-2",
      "hotelId": "test-hotel-1",
      "hotel": {
        "name": "Hotel test-hotel-1",
        "city": "Seoul",
        "stars": 4
      },
      "discountPercent": 0
    }]
  }
}
```

2. **ACL блокировка без заголовка userid:**
```json
{
  "errors": [{
    "message": "Unauthorized: userid header required"
  }],
  "data": {
    "bookingsByUser": null
  }
}
```

3. **ACL блокировка чужих данных:**
При запросе с userid: "test-user-1" для данных "test-user-2":
```json
{
  "data": {
    "bookingsByUser": []
  }
}
```

## 🏗️ Архитектура решения

```
┌─────────────┐    GraphQL    ┌─────────────┐
│   Client    │ ────────────→ │   Gateway   │
│             │               │   (4000)    │
└─────────────┘               └─────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                  ▼
           ┌─────────────┐                   ┌─────────────┐
           │  Booking    │                   │    Hotel    │
           │  Subgraph   │                   │  Subgraph   │
           │   (4001)    │                   │   (4002)    │
           └─────────────┘                   └─────────────┘
                    │                                  │
       ┌────────────┴────────┐                       │
       ▼                     ▼                       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ PostgreSQL  │       │    gRPC     │       │   Monolith  │
│ booking-db  │       │   Service   │       │  REST API   │
│   (5433)    │       │   (9090)    │       │   (8084)    │
└─────────────┘       └─────────────┘       └─────────────┘
```

## 🔒 ACL (Access Control List)

Реализована трёхуровневая защита:
1. **Проверка наличия заголовка** - без userid возвращается ошибка
2. **Проверка совпадения userId** - пользователь видит только свои данные
3. **Мягкая блокировка** - при попытке доступа к чужим данным возвращается пустой массив

## 🚀 Запуск и использование

```bash
# Запуск всех сервисов
docker-compose up -d --build

# GraphQL Playground доступен на
http://localhost:4000

# Пример запроса с авторизацией
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -H "userid: test-user-2" \
  -d '{"query": "query { bookingsByUser(userId: \"test-user-2\") { id hotel { name city } } }"}'
```

## 📊 Статус контейнеров

Все 11 контейнеров успешно запущены и работают:
- apollo-gateway (порт 4000)
- booking-subgraph (порт 4001)  
- hotel-subgraph (порт 4002)
- booking-service (gRPC, порт 9090)
- hotelio-monolith (порт 8084)
- booking-history-service
- Базы данных и Kafka инфраструктура

## 🎯 Итоги

✅ **Все требования задания выполнены:**
- GraphQL Federation полностью работает
- ACL защищает данные пользователей
- Интеграция с существующими микросервисами
- Docker контейнеризация и сетевая интеграция
- Передача заголовков между gateway и subgraphs

**Система готова к использованию в качестве BFF (Backend for Frontend) для личного кабинета Hotelio!**