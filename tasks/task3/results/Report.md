# Task 3: GraphQL Federation - Описание Изменений

## Что Было Реализовано

### 1. booking-subgraph (порт 4001)
- **gRPC интеграция**: Подключение к booking-service:9090 для получения реальных данных из PostgreSQL
- **ACL**: Проверка userid заголовка - пользователь видит только свои бронирования
- **Federation**: @key(fields: "id") для интеграции с Apollo Gateway
- **Query**: userBookings(userId: String!) - возвращает бронирования текущего пользователя

### 2. hotel-subgraph (порт 4002)
- **DataLoader батчирование**: Решение проблемы N+1 запросов
  - Вместо 10 отдельных запросов к отелям используется 1 батч-запрос
  - 11 запросов → 2 запроса (82% оптимизация)
- **__resolveReference**: Поддержка федерации для резолвинга ссылок на отели
- **Встроенные данные**: test-hotel-1 (Seoul), test-hotel-2 (Busan), test-hotel-3 (Incheon)

### 3. promo-subgraph (порт 4003)
- **@override директива**: Переопределяет discountPercent из booking-subgraph
- **@requires директива**: Указывает зависимости между полями (promoCode, hotelId)
- **@external директива**: Ссылается на поля из booking-subgraph
- **Встроенные промокоды**: SUMMER (10%), VIP25 (25%), WELCOME (20%)

### 4. apollo-gateway (порт 4000)
- **Федерация трёх подграфов**: booking, hotel, promo
- **Header propagation**: Пробрасывает userid заголовок ко всем подграфам для ACL

### 5. DiscountInfo тип (promo-subgraph)
```graphql
type DiscountInfo {
  isValid: Boolean!                    # Валидна ли скидка
  originalDiscount: Float!             # Исходное значение из booking
  finalDiscount: Float!                # Актуальное значение после проверки
  description: String                  # Описание скидки
  expiresAt: String                    # Дата истечения
  applicableHotels: [ID!]!             # Список отелей, где применима
}
```

## Docker Контейнеры
- task3-booking-subgraph-1 (порт 4001)
- task3-hotel-subgraph-1 (порт 4002)
- task3-promo-subgraph-1 (порт 4003)
- task3-apollo-gateway-1 (порт 4000)

---

## 🔌 Интеграция между компонентами

### Архитектура
```
┌─────────────────────────────────────────┐
│        APOLLO GATEWAY (4000)            │
│  Агрегирует запросы трёх подграфов      │
└──────────┬──────────┬──────────┬────────┘
           │          │          │
    ┌──────▼──┐ ┌──────▼──┐ ┌──────▼──┐
    │ booking │ │ hotel   │ │ promo   │
    │ (4001)  │ │ (4002)  │ │ (4003)  │
    └─────────┘ └────┬────┘ └─────────┘
                     │          
                 gRPC│          
                 INT │          
                     ▼          
        ┌──────────────────────────┐
        │  booking-service:9090    │
        │  (Task 2)                │
        └──────────────────────────┘
```

### Поток данных

**Запрос:** Получить бронирования пользователя
```graphql
query {
  userBookings(userId: "test-user-2") {
    id
    promoCode
    hotel { name city }
    discountInfo { finalDiscount }
  }
}
```

**1. Apollo Gateway** получает запрос
```
Headers: { userid: "test-user-2" }
```

**2. booking-subgraph**
- ✅ Проверяет ACL: `userid` = `test-user-2`
- ✅ Вызывает gRPC booking-service:9090
- ✅ Возвращает: `[{ id: "2", promoCode: "WELCOME", hotelId: "test-hotel-2" }]`

**3. hotel-subgraph** (для поля `hotel`)
- ✅ Получает hotelId из booking
- ✅ DataLoader батчирует запрос
- ✅ Возвращает: `{ id: "test-hotel-2", name: "Busan Inn", city: "Busan", stars: 4 }`

**4. promo-subgraph** (для поля `discountInfo`)
- ✅ Получает promoCode ("WELCOME") и hotelId ("test-hotel-2")
- ✅ Валидирует что WELCOME применим к test-hotel-2
- ✅ Вычисляет @override discountPercent: 20%
- ✅ Возвращает: `{ isValid: true, finalDiscount: 20, applicableHotels: [...] }`

**5. Apollo Gateway** объединяет результаты
```json
{
  "userBookings": [{
    "id": "2",
    "promoCode": "WELCOME",
    "hotel": {
      "name": "Busan Inn",
      "city": "Busan"
    },
    "discountInfo": {
      "finalDiscount": 20
    }
  }]
}
```

---

## ⚡ N+1 Решение через DataLoader

### Проблема (без DataLoader)
```
Запрос: Получить 10 бронирований с информацией об отелях

Без оптимизации:
  Запрос 1: GetBookings(userId) → 10 результатов
  Запрос 2: GetHotel(test-hotel-1)
  Запрос 3: GetHotel(test-hotel-2)
  ...
  Запрос 11: GetHotel(test-hotel-10)
  
  ИТОГО: 11 запросов ❌
```

### Решение (с DataLoader)
```
С DataLoader батчированием:
  Запрос 1: GetBookings(userId) → 10 результатов
  Запрос 2: GetHotels([test-hotel-1, test-hotel-2, ...]) → все за раз
  
  ИТОГО: 2 запроса ✅ (82% оптимизация)
```

## 🎟️ @override директива (promo-subgraph)

**booking-subgraph определяет:**
```graphql
type Booking {
  id: ID!
  discountPercent: Float  # Скидка из бронирования (10%)
}
```

**promo-subgraph переопределяет:**
```graphql
extend type Booking {
  discountPercent: Float! @override(from: "booking") @requires(fields: "promoCode hotelId")
}
```

**Результат:**
- Исходная скидка из booking: 10%
- После @override из promo: 20% (WELCOME промокод)
- В ответе: 20% ✅

### Промокоды и их применимость

| Промокод | Скидка | Применим для | Валидация |
|----------|--------|--------------|-----------|
| SUMMER | 10% | Все отели | ✅ applicableHotels: [1,2,3] |
| VIP25 | 25% | Только Seoul | ✅ applicableHotels: [1] |
| WELCOME | 20% | Seoul, Busan | ✅ applicableHotels: [1,2] |

---

## 🧪 Результаты тестирования

### GraphQL запрос полного профиля
```graphql
query {
  userBookings(userId: "test-user-2") {
    id
    userId
    promoCode
    hotel { name city stars }
    discountPercent        # Из promo-subgraph (@override)
    discountInfo {         # Полная информация о скидке
      isValid
      originalDiscount
      finalDiscount
      description
      expiresAt
      applicableHotels
    }
  }
}
```

### Результат
```json
{
  "data": {
    "userBookings": [
      {
        "id": "2",
        "userId": "test-user-2",
        "promoCode": "WELCOME",
        "hotel": {
          "name": "Busan Inn",
          "city": "Busan",
          "stars": 4
        },
        "discountPercent": 20,
        "discountInfo": {
          "isValid": true,
          "originalDiscount": 0,
          "finalDiscount": 20,
          "description": "Welcome offer for new users",
          "expiresAt": "2026-09-30",
          "applicableHotels": ["test-hotel-1", "test-hotel-2"]
        }
      }
    ]
  }
}
```