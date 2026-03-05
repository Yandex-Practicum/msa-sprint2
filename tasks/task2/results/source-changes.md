# Изменения в исходном коде — Task 2

## Обнаруженные проблемы и их решения

### Баг #1: NullPointerException в GrpcBookingService.listAll(null)

**Файл**: `tasks/monolith/hotelio-monolith-1.0.0.jar` → `BOOT-INF/lib/p-o-y-1.0.0.jar`
**Класс**: `com.hotelio.GrpcBookingService`
**Метод**: `listAll(String userId)`

**Суть бага** (из декомпиляции байткода):
```java
// Оригинальный код в p-o-y-1.0.0.jar — БАГОВАННЫЙ
public List<Booking> listAll(String userId) {
    BookingListRequest request = BookingListRequest.newBuilder()
        .setUserId(userId)   // ← NPE когда userId=null (protobuf не принимает null)
        .build();
    return stub.listBookings(request).getBookingsList()
               .stream().map(this::toBooking).toList();
}
```

**Дополнительная проблема**: даже без NPE — `listAll()` пересылает запрос в gRPC,
тогда как по архитектуре Strangler Fig `GET /api/bookings` должен читать из **локальной**
монолитной БД (там лежат фикстуры и исторические данные, недоступные в booking-service).

**Проявление**: тест `GET /api/bookings` → HTTP 500, `GET /api/bookings?userId=X` → HTTP 500.

---

## Внесённые изменения

### 1. `hotelio-monolith/build.gradle` — обновлён

**До**:
```groovy
dependencies {
    ...
    implementation files('libs/p-o-y-1.0.0.jar')   // pre-built JAR с багом
}
```

**После**:
```groovy
plugins {
    ...
    id("com.google.protobuf") version "0.9.4"    // добавлен плагин генерации proto
}

ext {
    grpcVersion = '1.64.0'
    protobufVersion = '3.25.3'
}

dependencies {
    ...
    // убрано: implementation files('libs/p-o-y-1.0.0.jar')
    compileOnly("javax.annotation:javax.annotation-api:1.3.2")  // нужен для grpc-gen кода
}

protobuf {
    protoc { artifact = "com.google.protobuf:protoc:${protobufVersion}" }
    plugins { grpc { artifact = "io.grpc:protoc-gen-grpc-java:${grpcVersion}" } }
    generateProtoTasks { all()*.plugins { grpc {} } }
}
```

**Причина**: заменили pre-built JAR на генерацию proto-классов из исходника +
свою реализацию GrpcBookingService без бага.

---

### 2. `hotelio-monolith/src/main/java/com/hotelio/GrpcBookingService.java` — создан

**Заменяет** `com.hotelio.GrpcBookingService` из `p-o-y-1.0.0.jar`.

**Ключевые исправления**:
```java
// ИСПРАВЛЕНО: listAll читает из локального BookingRepository, не из gRPC
@Override
public List<Booking> listAll(String userId) {
    return userId != null
        ? bookingRepository.findByUserId(userId)
        : bookingRepository.findAll();    // null-safe, работает с фикстурами
}

// createBooking — делегирует в gRPC (как и раньше), с null-safe promoCode
@Override
public Booking createBooking(String userId, String hotelId, String promoCode) {
    BookingRequest request = BookingRequest.newBuilder()
        .setUserId(userId)
        .setHotelId(hotelId)
        .setPromoCode(promoCode != null ? promoCode : "")   // null-safe
        .build();
    return toBooking(stub.createBooking(request));
}
```

**Конструктор** расширен: принимает `BookingRepository` для поддержки `listAll()`.

---

### 3. `hotelio-monolith/src/main/java/com/hotelio/BookingServiceProxyConfig.java` — создан

**Заменяет** `com.hotelio.BookingServiceProxyConfig` из `p-o-y-1.0.0.jar`.

```java
@Configuration
@ConditionalOnProperty(prefix = "booking.service", name = "external-host")
public class BookingServiceProxyConfig {
    @Bean @Primary
    public BookingService grpcBookingService(ManagedChannel grpcChannel,
                                             BookingRepository bookingRepository) {
        // ИЗМЕНЕНО: передаём bookingRepository в конструктор (нужен для listAll)
        return new GrpcBookingService(
            BookingServiceGrpc.newBlockingStub(grpcChannel),
            bookingRepository
        );
    }
}
```

Активируется при наличии env vars:
- `BOOKING_SERVICE_EXTERNAL_HOST=booking-service`
- `BOOKING_SERVICE_EXTERNAL_PORT=9090`

---

### 4. `hotelio-monolith/src/main/proto/booking.proto` — создан

Скопирован из `tasks/task2/booking.proto`. Нужен для генерации gRPC-стабов при
сборке монолита из исходников.

---

### 5. `hotelio-monolith/Dockerfile` — создан (новый)

Multi-stage build из исходников (вместо копирования pre-built JAR):
```dockerfile
FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src ./src
RUN gradle build --no-daemon -x test

FROM eclipse-temurin:17-jre-jammy
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Почему не `gradlew`**: на Windows файл `gradlew` имеет CRLF-окончания строк,
из-за чего shebang `#!/bin/sh` не читается в Linux-контейнере → используем
системный Gradle из образа `gradle:8.5-jdk17`.

---

### 6. `tasks/task2/docker-compose.yml` — обновлён

**Изменения**:
1. Контекст сборки монолита: `../monolith` → `../../hotelio-monolith` (сборка из исходников)
2. Добавлен `depends_on: monolith-db, booking-service` для монолита
3. Добавлены 4 новых сервиса:
   - `booking-db` (postgres:15)
   - `booking-service` (gRPC :9090)
   - `booking-history-db` (postgres:15)
   - `booking-history-service` (REST :8085)
4. Добавлены тома `booking-db-data`, `booking-history-db-data`

---

### 7. Новые сервисы (созданы с нуля)

#### `tasks/task2/booking-service/`
Spring Boot gRPC-сервер. Реализует `booking.BookingService` по контракту `booking.proto`.
- **Зависимость**: `net.devh:grpc-server-spring-boot-starter:2.15.0.RELEASE`
- **gRPC-версии**: `grpcVersion=1.58.0`, `protobufVersion=3.24.0`
- **Особенность**: добавлен `javax.annotation:javax.annotation-api:1.3.2` (compileOnly) —
  обязателен для компиляции grpc-gen кода под Java 17 (из JDK удалён `javax.annotation`)

#### `tasks/task2/booking-history-service/`
Spring Boot Kafka consumer. Слушает топик `booking-events`, сохраняет в `booking_history`.
- REST эндпоинт `GET /api/history/bookings` (порт 8085) для проверки данных

---

## Файлы, не изменявшиеся

| Файл | Статус |
|---|---|
| `test/regress.sh` | Без изменений — все 27 тестов прошли as-is |
| `test/init-fixtures.sql` | Без изменений |
| `hotelio-monolith/src/main/java/com/hotelio/monolith/**` | Без изменений |
| `tasks/monolith/hotelio-monolith-1.0.0.jar` | Не используется в task2 (заменён сборкой из источников) |
| `tasks/task2/booking.proto` | Без изменений (скопирован в оба места) |
