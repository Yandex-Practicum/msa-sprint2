## Подготовка окружения

1. Сеть Docker (один раз):

```bash
docker network create hotelio-net
```

2. Остановите compose из задания 1 (если поднимали), иначе имена контейнеров (`hotelio-monolith`, `hotelio-db` и т.д.) конфликтуют:

```bash
cd ../task1   # или каталог, откуда поднимали монолит
docker compose down
```

Если видите `Conflict. The container name "/hotelio-monolith" is already in use`, удалите старый контейнер:

```bash
docker rm -f hotelio-monolith
```

Затем в каталоге задания 2:

```bash
docker compose up -d --build
```

### Сборка JAR монолита

Образ монолита берёт готовый `tasks/monolith/hotelio-monolith-1.0.0.jar`. После изменений в `hotelio-monolith/` пересоберите JAR.

Если локальный `./gradlew` падает из‑за слишком новой Java на хосте, используйте Gradle в Docker:

```bash
docker run --rm --user root \
  -v "$(pwd)/../../hotelio-monolith:/p" \
  -v "$(pwd)/../monolith:/out" \
  gradle:8.14-jdk17 bash -c "cd /p && ./gradlew bootJar -x test --no-daemon && cp -f build/libs/hotelio-monolith-1.0.0.jar /out/"
```

(Команда из корня `tasks/task2`; при другом расположении поправьте пути к `hotelio-monolith` и `tasks/monolith`.)

---

## Проверка корректности

В логах монолита при профиле `grpc-booking` должны быть строки:

```
➡️  BookingService beans:
    - bookingService: class com.hotelio.monolith.service.BookingService
    - grpcBookingService: class com.hotelio.monolith.grpc.GrpcBookingService
```

### Регрессионные тесты

В [test/readme.md](../../test/readme.md) заданы переменные для основной БД и, для задания 2, для **booking-db** (`BOOKING_DB_*`). После поднятия всего стека тесты бронирования должны проходить.

Проверка истории: `docker logs hotelio-booking-history` — после успешных POST бронирований должны появляться строки `stored booking_history`.
