# 🏨 Задание 2: Миграция модуля бронирования на микросервисную архитектуру

> **Проект:** Hotelio — система бронирования отелей  
> **Паттерн миграции:** Strangler Fig (Душащий инжир)  
> **Дата выполнения:** Август 2026

---

## 📋 Содержание

1. [Обзор](#-обзор)
2. [Архитектура системы](#-архитектура-системы)
3. [Диаграмма последовательности](#-диаграмма-последовательности)
4. [Модель данных](#-модель-данных)
5. [Deployment Diagram](#-deployment-diagram)
6. [Стратегия миграции](#-стратегия-миграции)
7. [Стратегия To-Be](#-стратегия-to-be)
8. [Технологии](#-технологии)
9. [Запуск проекта](#-запуск-проекта)
10. [Артефакты](#-артефакты)

---

## 🎯 Обзор

В рамках задания реализована **постепенная миграция** модуля бронирования из монолитного приложения в отдельный микросервис. Клиенты продолжают работать с существующим API монолита, а внутренняя логика создания бронирований переключена на новый сервис `booking-service`.

### Ключевые принципы

- ✅ **Прозрачность для клиентов** — API не меняется
- ✅ **Постепенность** — миграция без остановки системы
- ✅ **Обратимость** — возможность отката на любом этапе
- ✅ **Асинхронность** — события обрабатываются через Kafka

---

## 🏗 Архитектура системы

### Component Diagram

```mermaid
graph TB
    subgraph Client["👤 Клиент"]
        Browser[Браузер]
    end

    subgraph Monolith["🏛 Монолит Spring Boot :8080"]
        BookingController[BookingController]
        UserController[UserController]
        HotelController[HotelController]
        GrpcClient[gRPC Client]
    end

    subgraph BookingService["📦 booking-service .NET :9090"]
        GrpcServer[gRPC Server]
        ValidationLogic[Валидация]
        BookingRepo[Booking Repository]
        KafkaProducer[Kafka Producer]
    end

    subgraph HistoryService["📊 booking-history-service .NET"]
        KafkaConsumer[Kafka Consumer]
        HistoryRepo[History Repository]
    end

    subgraph DataStores["💾 Хранилища данных"]
        MonolithDB[(hotelio-db<br/>PostgreSQL :5432)]
        BookingDB[(booking-service-db<br/>PostgreSQL :5433)]
        HistoryDB[(booking-history-db<br/>PostgreSQL :5434)]
    end

    subgraph MessageBroker["📨 Kafka :9092"]
        Topic[booking-events]
        ZK[Zookeeper :2181]
    end

    Browser -->|HTTP/REST| BookingController
    Browser -->|HTTP/REST| UserController
    Browser -->|HTTP/REST| HotelController
    
    BookingController --> GrpcClient
    GrpcClient -->|gRPC HTTP/2| GrpcServer
    
    GrpcServer --> ValidationLogic
    ValidationLogic -->|HTTP/REST| UserController
    ValidationLogic -->|HTTP/REST| HotelController
    
    GrpcServer --> BookingRepo
    BookingRepo --> BookingDB
    
    GrpcServer --> KafkaProducer
    KafkaProducer -->|produce| Topic
    
    Topic -->|consume| KafkaConsumer
    KafkaConsumer --> HistoryRepo
    HistoryRepo --> HistoryDB
    
    UserController --> MonolithDB
    HotelController --> MonolithDB
    
    ZK -.->|координация| Topic

```
### 🔄 Диаграмма последовательности
## Создание бронирования
🔄 Диаграмма последовательности
```mermaid
sequenceDiagram
    autonumber
    actor Client as 👤 Клиент
    participant Monolith as 🏛 Монолит<br/>(Spring Boot)
    participant Booking as 📦 booking-service<br/>(.NET)
    participant DB as 💾 booking-service-db<br/>(PostgreSQL)
    participant Kafka as 📨 Kafka
    participant History as 📊 booking-history-service

    Client->>+Monolith: POST /api/bookings<br/>?userId=...&hotelId=...&promoCode=...
    
    Monolith->>+Booking: gRPC CreateBooking<br/>(BookingRequest)
    
    Note over Booking: Валидация пользователя
    Booking->>+Monolith: GET /api/users/{id}/authorized
    Monolith-->>-Booking: true
    
    Note over Booking: Валидация отеля
    Booking->>+Monolith: GET /api/hotels/{id}/operational
    Monolith-->>-Booking: true
    
    Booking->>+Monolith: GET /api/reviews/hotel/{id}/trusted
    Monolith-->>-Booking: true
    
    Booking->>+Monolith: GET /api/hotels/{id}/fully-booked
    Monolith-->>-Booking: false
    
    Note over Booking: Валидация промокода
    Booking->>+Monolith: POST /api/promos/validate
    Monolith-->>-Booking: {"discount": 10.0}
    
    Note over Booking: Сохранение в БД
    Booking->>+DB: INSERT INTO "Bookings"
    DB-->>-Booking: BookingId = 42
    
    Note over Booking: Публикация события
    Booking->>+Kafka: Produce booking-events<br/>{"BookingId": 42, ...}
    Kafka-->>-Booking: OK
    
    Booking-->>-Monolith: BookingResponse<br/>{id: 42, price: 90.0, ...}
    Monolith-->>-Client: 200 OK<br/>{id: 42, ...}
    
    Note over Kafka,History: Асинхронная обработка
    Kafka->>+History: Consume booking-events
    History->>+History: Сохранение в BookingHistories
    deactivate History
```

### Обработка ошибок
```mermaid
sequenceDiagram
    autonumber
    actor Client as 👤 Клиент
    participant Monolith as 🏛 Монолит
    participant Booking as 📦 booking-service

    Client->>+Monolith: POST /api/bookings<br/>?userId=blacklisted-user
    
    Monolith->>+Booking: gRPC CreateBooking
    
    Booking->>+Monolith: GET /api/users/{id}/authorized
    Monolith-->>-Booking: false
    
    Note over Booking: ❌ Пользователь не авторизован
    
    Booking-->>Monolith: RpcException<br/>PERMISSION_DENIED<br/>"Пользователь не авторизован"
    deactivate Booking
    
    Monolith-->>-Client: 500 Internal Server Error
```
### 📊 Модель данных
## Class Diagram
```mermaid
classDiagram
    class Booking {
        +int Id
        +string UserId
        +string HotelId
        +string? PromoCode
        +decimal DiscountPercent
        +decimal Price
        +DateTime CreatedAt
    }
    
    class BookingHistory {
        +int Id
        +int BookingId
        +string UserId
        +string HotelId
        +string? PromoCode
        +decimal DiscountPercent
        +decimal Price
        +DateTime BookingCreatedAt
        +DateTime EventTimestamp
    }
    
    class BookingRequest {
        +string user_id
        +string hotel_id
        +string? promo_code
    }
    
    class BookingResponse {
        +int32 id
        +string user_id
        +string hotel_id
        +string? promo_code
        +double discount_percent
        +double price
        +string created_at
    }
    
    class BookingEventDto {
        +int BookingId
        +string UserId
        +string HotelId
        +string? PromoCode
        +decimal DiscountPercent
        +decimal Price
        +DateTime CreatedAt
    }
    
    BookingRequest ..> Booking : создаёт
    Booking ..> BookingResponse : преобразуется
    Booking ..> BookingEventDto : генерирует событие
    BookingEventDto ..> BookingHistory : создаёт историю
```
### ER Diagram
```mermaid
erDiagram
    BOOKINGS {
        int Id PK
        string UserId
        string HotelId
        string PromoCode
        decimal DiscountPercent
        decimal Price
        timestamp CreatedAt
    }
    
    BOOKING_HISTORIES {
        int Id PK
        int BookingId FK
        string UserId
        string HotelId
        string PromoCode
        decimal DiscountPercent
        decimal Price
        timestamp BookingCreatedAt
        timestamp EventTimestamp
    }
    
    APP_USER {
        string id PK
        string status
        bool blacklisted
        bool active
        string name
        string email
        string city
    }
    
    HOTEL {
        string id PK
        bool operational
        bool fully_booked
        string city
        float rating
        string description
    }
    
    PROMO_CODE {
        string code PK
        decimal discount
        bool vip_only
        bool expired
        date valid_until
        string description
    }
    
    BOOKINGS ||--o{ BOOKING_HISTORIES : "порождает"
    APP_USER ||--o{ BOOKINGS : "создаёт"
    HOTEL ||--o{ BOOKINGS : "бронируется"
    PROMO_CODE ||--o{ BOOKINGS : "применяется"
```

### Deployment diagram

```mermaid
graph TB
    subgraph DockerHost["🖥 Docker Host"]
        subgraph Network["🌐 Docker сеть: hotelio-net"]
            
            subgraph AppLayer["📱 Слой приложений"]
                M1[hotelio-monolith<br/>Java Spring Boot<br/>:8084 → 8080]
                B1[booking-service<br/>.NET 8 gRPC<br/>:9090]
                H1[booking-history-service<br/>.NET 8 Consumer]
            end
            
            subgraph DataLayer["💾 Слой данных"]
                DB1[(hotelio-db<br/>PostgreSQL<br/>:5432)]
                DB2[(booking-service-db<br/>PostgreSQL<br/>:5433)]
                DB3[(booking-history-db<br/>PostgreSQL<br/>:5434)]
            end
            
            subgraph MessageLayer["📨 Слой сообщений"]
                K1[kafka<br/>Confluent<br/>:9092]
                Z1[zookeeper<br/>Confluent<br/>:2181]
            end
        end
    end
    
    User((👤 Пользователь)) -->|HTTP :8084| M1
    
    M1 -->|gRPC| B1
    M1 -->|JDBC| DB1
    B1 -->|HTTP| M1
    B1 -->|EF Core| DB2
    B1 -->|Produce| K1
    K1 -->|Consume| H1
    H1 -->|EF Core| DB3
    Z1 -.->|координация| K1
```
### Стратегия миграции
## State Diagram: Фазы миграции
```mermaid
stateDiagram-v2
    [*] --> AsIs: Исходное состояние

    AsIs --> Phase1: Фаза 1<br/>Параллельная работа
    Phase1 --> Phase2: Фаза 2<br/>Перенос данных
    Phase2 --> Phase3: Фаза 3<br/>Переключение трафика
    Phase3 --> ToBe: Целевое состояние

    state AsIs {
        [*] --> MonolithOnly
        MonolithOnly: Все данные в монолите
        MonolithOnly: Один сервис
        MonolithOnly: Одна БД
    }

    state Phase1 {
        [*] --> Parallel
        Parallel: Новые бронирования → booking-service
        Parallel: Старые данные → монолит
        Parallel: Клиенты не замечают изменений
    }

    state Phase2 {
        [*] --> Migration
        Migration: Скрипт миграции данных
        Migration: Батчевая обработка
        Migration: Проверка целостности
    }

    state Phase3 {
        [*] --> Switch
        Switch: Весь трафик → booking-service
        Switch: Старая БД read-only
        Switch: Монолит как прокси
    }

    state ToBe {
        [*] --> Microservices
        Microservices: Независимые сервисы
        Microservices: Свои БД у каждого
        Microservices: Событийная архитектура
    }

    ToBe --> [*]
```
### Strategy Diagram
```mermaid
graph LR
    subgraph AsIs["🔴 As-Is: Монолит"]
        A1[Одно приложение]
        A2[Одна БД]
        A3[Один язык]
        A4[Общий деплой]
    end
    
    subgraph Transition["🟡 Переходный период"]
        T1[Strangler Fig]
        T2[Параллельная работа]
        T3[Постепенный перенос]
    end
    
    subgraph ToBe["🟢 To-Be: Микросервисы"]
        B1[Независимые сервисы]
        B2[Свои БД]
        B3[Разные языки]
        B4[Независимый деплой]
        B5[Событийная архитектура]
    end
    
    AsIs --> Transition
    Transition --> ToBe
    
    style AsIs fill:#ffebee
    style Transition fill:#fff9c4
    style ToBe fill:#e8f5e9
```

### 🎯 Стратегия To-Be
## Целевая архитектура
```mermaid
graph TB
    subgraph Gateway["🚪 API Gateway"]
        GW[Маршрутизация<br/>Аутентификация<br/>Rate limiting]
    end

    subgraph Services["📦 Доменные сервисы"]
        US[UserService<br/>Пользователи]
        HS[HotelService<br/>Отели]
        BS[BookingService<br/>Бронирования]
        PS[PromoCodeService<br/>Промокоды]
        RS[ReviewService<br/>Отзывы]
    end

    subgraph EventBroker["📨 Kafka Bus"]
        EB[user-events<br/>hotel-events<br/>booking-events<br/>promo-events<br/>review-events]
    end

    subgraph Analytics["📊 Аналитика"]
        AS[AnalyticsService]
        NS[NotificationService]
    end

    subgraph Storage["💾 Хранилища"]
        UDB[(user-db)]
        HDB[(hotel-db)]
        BDB[(booking-db)]
        PDB[(promo-db)]
        RDB[(review-db)]
    end

    Client((👤 Клиент)) --> GW

GW --> US
GW --> HS
GW --> BS
GW --> PS
GW --> RS

US --> UDB
HS --> HDB
BS --> BDB
PS --> PDB
RS --> RDB

US -.->|события| EB
HS -.->|события| EB
BS -.->|события| EB
PS -.->|события| EB
RS -.->|события| EB

EB -.-> AS
EB -.-> NS
```
# Сравнение архитектуры и технологический стек

## 📊 Сравнение As-Is и To-Be

| Аспект | As-Is (Монолит) | To-Be (Микросервисы) |
| :--- | :--- | :--- |
| **Архитектура** | Монолит | Микросервисы |
| **БД** | Одна общая | У каждого сервиса своя |
| **Деплой** | Всё сразу | Независимый |
| **Масштабирование** | Вертикальное | Горизонтальное |
| **Языки** | Только Java | Любой подходящий |
| **Отказоустойчивость** | Низкая | Высокая |
| **Сложность разработки** | Низкая initially | Выше initially |
| **Скорость выхода на рынок** | Медленно | Быстро |

---

## 🛠 Технологии

| Компонент | Технология | Версия | Назначение |
| :--- | :--- | :--- | :--- |
| **Монолит** | Java, Spring Boot | 3.x | API Gateway + валидация |
| **booking-service** | .NET, gRPC | 8.0 | Управление бронированиями |
| **booking-history-service** | .NET, Kafka Consumer | 8.0 | Аналитика бронирований |
| **Протокол** | gRPC (HTTP/2 + Protobuf) | 1.64+ | Межсервисное взаимодействие |
| **База данных** | PostgreSQL | 15 | Хранение данных |
| **ORM** | Entity Framework Core | 8.0 | Работа с БД |
| **Брокер сообщений** | Apache Kafka | 7.2.1 | Асинхронная коммуникация |
| **Координация** | Apache Zookeeper | 7.2.1 | Управление Kafka |
| **Оркестрация** | Docker Compose | 2.x | Развёртывание |

### 🚀 Запуск проекта
## Быстрый старт

```bash
# 1. Запуск всех сервисов
docker compose up -d --build

# 2. Ожидание инициализации (30-60 секунд)
sleep 30

# 3. Проверка статуса
docker ps
```

### Загрузка тестовых данных
```powershell
# Копирование фикстур
docker cp results/init-fixtures.sql hotelio-db:/tmp/init-fixtures.sql

# Выполнение SQL
docker exec -it hotelio-db psql -U hotelio -d hotelio -f /tmp/init-fixtures.sql
```

## Тестирование
```powershell
# Создание бронирования
curl.exe -X POST "http://localhost:8084/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1"

# Листинг через REST
curl.exe "http://localhost:8084/api/bookings?userId=test-user-2"

# Листинг через gRPC
'{"user_id": "test-user-2"}' | docker run -i --rm --network hotelio-net fullstorydev/grpcurl -plaintext -d '@' booking-service:9090 booking.BookingService/ListBookings
```

## 📁 Артефакты

| Файл | Описание |
| :--- | :--- |
| **docker-ps.log** | Вывод команды `docker ps` |
| **init-fixtures.sql** | Скрипт автоматической загрузки тестовых данных |
| **regress.ps1** | Скрипт запуска регрессионных тестов |
| **regress-output.log** | Подробные результаты выполнения автотестов |
| **test-log.txt** | Подробный лог сетевых запросов |
| **bookings-new-db.txt** | Срез данных из новой базы данных |
| **bookings-old-db.txt** | Срез данных из старой (исходной) базы данных |
| **booking-history.txt** | Срез данных из специализированной БД аналитики |
| **listing-comparison.txt** | Сравнительный анализ производительности REST и gRPC |
| **README.md** | Настоящий сопроводительный документ |

---

## ⚖️ Преимущества и риски

### ✅ Преимущества миграции

| Преимущество | Описание |
| :--- | :--- |
| **Независимое развёртывание** | Сервис `booking-service` обновляется отдельно без перезапуска основного монолита. |
| **Масштабируемость** | Возможность точечно масштабировать только наиболее нагруженные сервисы системы. |
| **Отказоустойчивость** | Внезапное падение одного изолированного сервиса не приводит к отказу всей системы. |
| **Технологическая гибкость** | Использование оптимальных языков программирования и фреймворков под конкретные задачи. |
| **Постепенность** | Перенос функционала шаг за шагом, исключающий необходимость переписывать всё приложение сразу. |
| **Обратимость** | Безопасная возможность быстрого отката изменений на любом этапе процесса миграции. |

### ⚠️ Риски и их митигация

| Риск | Митигация |
| :--- | :--- |
| **Сложность отладки** | Внедрение систем централизованного логирования и сквозной трассировки запросов. |
| **Сетевые задержки** | Использование высокопроизводительного gRPC вместо классического REST, оптимизация кэширования. |
| **Консистентность данных** | Реализация паттернов событийной архитектуры и координации распределенных транзакций (Саги). |
| **Отказ сервиса** | Внедрение паттерна Circuit Breaker (предохранитель) и настройка политик повторных запросов (Retry). |
| **Сложность развёртывания** | Автоматизация среды окружения с помощью Docker Compose и настройка пайплайнов CI/CD. |
| **Мониторинг** | Развертывание связки Prometheus и Grafana для непрерывного отслеживания метрик и алертинга. |
