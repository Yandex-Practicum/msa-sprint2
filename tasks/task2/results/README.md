# Архитектурное решение (ADR): Миграция сервиса бронирования в микросервис с Kafka

**Название задачи:** Выделение сервиса бронирования из монолита (Паттерн Strangler Fig с gRPC и Kafka)  
**Автор:** Лобанов Павел  
**Дата:** 06.07.2026

---

## Обзор

Задание 2 реализует начало миграции сервиса бронирования из монолита в отдельный микросервис с использованием паттерна **Strangler Fig**, **gRPC** для синхронной интеграции и **Kafka** для асинхронной синхронизации данных.

---

## 🏗️ Архитектура решения

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                      MONOLITH (Java)                         │
│  ├─ REST API (localhost:8084)                                │
│  ├─ BookingController                                        │
│  │  └─ gRPC Client → booking-service:9090                   │
│  └─ Database (PostgreSQL hotelio:5443)                       │
└─────────────────────────────────────────────────────────────┘
                          │
                      gRPC over HTTP/2
                          ▼
┌──────────────────────────────────────────────┐
│   booking-service (C# gRPC Server)           │
│  ├─ gRPC:9090                                │
│  ├─ Kafka Producer                           │
│  └─ PostgreSQL БД (booking_db:5444)          │
└──────────────────────────────────────────────┘
                          │
                     Kafka Topic: 'bookings'
                   (BookingCreated events)
                          ▼
┌──────────────────────────────────────────────┐
│   booking-history-service (C# Worker)        │
│  ├─ Kafka Consumer (слушает 'bookings')      │
│  └─ PostgreSQL БД (booking_history_db:5445)  │
└──────────────────────────────────────────────┘
```

### Поток данных

1. **Создание бронирования:**
   - Monolith REST API (POST /api/bookings)
   - Вызывает `booking-service` через gRPC
   - booking-service сохраняет в своей БД
   - booking-service публикует событие BookingCreated в Kafka

2. **Синхронизация статистики:**
   - booking-history-service слушает топик 'bookings' в Kafka
   - Получает событие BookingCreated
   - Сохраняет в таблице HistoryBookings для аналитики

---

## 📊 Данные и результаты

### Таблица booking-service (PostgreSQL booking_db:5444)

```
 Id |   UserId    |   HotelId    | PromoCode | DiscountPercent | Price |           CreatedAt
----+-------------+--------------+-----------+-----------------+-------+-------------------------------
  1 | test-user-3 | test-hotel-1 |           |               0 |   100 | 2026-07-06 10:09:25.155151+00
  2 | test-user-2 | test-hotel-1 | TESTCODE1 |               0 |   100 | 2026-07-06 10:09:25.560058+00
(2 rows)
```

### Таблица booking-history-service (PostgreSQL booking_history_db:5445)

```
 Id |   UserId    |   HotelId    | PromoCode | DiscountPercent | Price |           CreatedAt           | Status
----+-------------+--------------+-----------+-----------------+-------+-------------------------------+---------
 1  | test-user-3 | test-hotel-1 |           |               0 |   100 | 2026-07-06 10:09:25.155151+00 | Created
 2  | test-user-2 | test-hotel-1 |           |               0 |   100 | 2026-07-06 10:09:25.560058+00 | Created
(2 rows)
```

### Проверка синхронизации

```
✅ booking-service: 2 бронирования
✅ booking-history-service: 2 события
✅ Разница: 0 (100% синхронизация)
✅ СИНХРОНИЗАЦИЯ РАБОТАЕТ
```

---
