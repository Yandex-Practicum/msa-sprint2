# Задание 2. booking-service и booking-history-service

## Что сделал

Оба сервиса написал на Node.js. Так короче, и gRPC через @grpc/proto-loader читает booking.proto без кодогенерации.

booking-service поднимает gRPC на 9090. Логику взял из BookingService монолита один в один: те же проверки пользователя, отеля, отзывов и промокода, та же цена (100 или 80 для VIP, минус скидка). Данные для проверок берет по REST из монолита. Брони хранит в своей базе booking-db. После создания брони отправляет в Kafka (топик booking-events) событие BookingCreated. Если Kafka недоступна, бронь все равно создается, в лог пишется ошибка.

booking-history-service читает booking-events и складывает события в таблицу booking_history в своей базе history-db. Для статистики сделал три view: stats_by_user, stats_by_hotel, stats_by_day.

В docker-compose.yml задания добавил оба сервиса и две базы (booking-db на 5433, history-db на 5434), все в сети hotelio-net. У монолита уже стоят BOOKING_SERVICE_EXTERNAL_HOST=booking-service и порт 9090.

list.js в booking-service это маленький скрипт, чтобы посмотреть брони напрямую по gRPC:

```bash
docker exec booking-service node list.js test-user-2
```

## Тесты

После включения прокси старый regress.sh падает на бронированиях, как и написано в задании, потому что в новой базе пусто.

Что поменял:

- добавил booking-fixtures.sql, это те же две тестовые брони, но для базы booking-service. regress.sh грузит их, если задан BOOKING_DB_HOST
- добавил проверку истории. Если задан HISTORY_DB_HOST, тест ждет пару секунд и смотрит, что в booking_history появились записи
- тест "получить все бронирования" теперь делает запрос с userId. Прокси в монолите (GrpcBookingService из libs/p-o-y-1.0.0.jar) падает с NullPointerException, если userId не передать, в логе монолита NPE на BookingListRequest.setUserId

Без новых переменных скрипт работает как раньше, для монолита ничего не сломано.

## Как запускать

```bash
cd tasks/task1 && docker compose down
cd ../task2 && docker compose up -d --build
```

Тесты (из корня репозитория):

```bash
docker build -t hotelio-tester test
docker run --rm --network hotelio-net \
  -e DB_HOST=hotelio-db -e DB_PORT=5432 -e DB_NAME=hotelio -e DB_USER=hotelio -e DB_PASSWORD=hotelio \
  -e BOOKING_DB_HOST=booking-db -e BOOKING_DB_PORT=5432 \
  -e HISTORY_DB_HOST=history-db -e HISTORY_DB_PORT=5432 \
  -e API_URL=http://hotelio-monolith:8080 \
  hotelio-tester
```

## Миграция данных

Схему таблицы booking в новом сервисе оставил такой же, как в монолите, чтобы переносить без преобразований.

1. Заранее копируем таблицу: pg_dump -t booking из базы монолита и загружаем в booking-db, потом выставляем sequence для id.
2. Включаем прокси в монолите (BOOKING_SERVICE_EXTERNAL_HOST). С этого момента новые брони пишутся только в booking-service.
3. То, что успело создаться между копией и переключением, докопируем (id > max(id)).
4. Старая таблица в монолите остается только на чтение, потом удаляем.
5. Историю для аналитики можно догрузить, отправив старые брони в Kafka как BookingCreated. Дублей не будет, в history-service ключ по booking_id.
6. Если надо откатиться, убираем переменную у монолита и докопируем новые брони обратно.

## To Be

- Новые клиенты ходят в booking-service напрямую или через GraphQL (задание 3), монолит остается только для старых.
- Вместо синхронных запросов в монолит держать свои копии нужных данных и обновлять их по событиям, или ходить в уже вынесенные сервисы.
- Отправлять события через outbox, чтобы не терять их, когда Kafka лежит.
- Docker образы, Helm, CI/CD (задание 4), Istio (задание 5).
