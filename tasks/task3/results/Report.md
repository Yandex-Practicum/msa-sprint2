# Отчёт о реализации GraphQL Federation (Sprint 2 - Task 3)

## 📌 Общее описание

В рамках задания реализована федеративная GraphQL архитектура, состоящая из трёх субграфов и Apollo Gateway. Система обеспечивает агрегацию данных из разных микросервисов, контроль доступа на уровне запросов и оптимизацию загрузки данных.

---

## 🏗️ Архитектура решения

| Компонент | Порт | Назначение |
|-----------|------|------------|
| **booking-subgraph** | 4001 | Управление бронированиями, ACL |
| **hotel-subgraph** | 4002 | Управление отелями, DataLoader |
| **promocode-subgraph** | 4003 | Управление промокодами, @override |
| **apollo-gateway** | 4000 | Объединение всех субграфов |

---


---

## 🔧 Реализованные задачи

### 1. Booking Subgraph

| Задача | Реализация |
|--------|------------|
| Замена заглушек на реальные вызовы | gRPC клиент к `booking-service` |
| ACL (пользователь видит только свои бронирования) | Проверка `currentUserId === userId` в резолвере `userBookings` |
| Federation support | `@key(fields: "id")` и `__resolveReference` |

### 2. Hotel Subgraph

| Задача | Реализация |
|--------|------------|
| Возврат описания отелей | Тип `Hotel` с полями `id`, `name`, `city`, `stars`, `address` и др. |
| Связь с бронированиями | `extend type Booking` + резолвер `hotel` |
| `__resolveReference` через ID | Реализован через DataLoader |
| Батчинг и кеширование | DataLoader + in-memory cache |
| Поле `hotelsByIds` | Добавлено для батчевых запросов |

### 3. Promocode Subgraph

| Задача | Реализация |
|--------|------------|
| Миграция типов из монолита | Типы `DiscountInfo`, `PromoCode` |
| `@override discountPercent` | Переопределение поля из `booking-subgraph` |
| `discountInfo @requires(promoCode)` | Зависимость от поля `promoCode` |
| `validatePromoCode` | Валидация промокода по коду и отелю |
| `activePromoCodes` | Список активных промокодов |

### 4. Apollo Gateway

| Задача | Реализация |
|--------|------------|
| Агрегация схем | `IntrospectAndCompose` с тремя субграфами |
| Проксирование запросов | `RemoteGraphQLDataSource` с передачей заголовков |
| Передача авторизации | Проксирование `x-user-id` в субграфы |

---

## 🐳 Docker Compose

Все сервисы запускаются в одной сети `hotelio-net` для обеспечения связности с существующими `booking-service` и монолитом.

---

## 🚀 Запуск системы

```bash
cd task3
docker-compose up -d --build
