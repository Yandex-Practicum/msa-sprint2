# Task 2 — результаты

## Что сделано

- `booking-service` — новый сервис, забирает на себя `POST /api/bookings`. Общение с монолитом — по gRPC, контракт `booking.proto`. Своя база `booking-db`. Проверки пользователя/отеля/промокода делает не сама, а ходит за ними в монолит по REST (`/api/users/...`, `/api/hotels/...`, `/api/reviews/...`, `/api/promos/validate`) — так же, как раньше это делал `BookingService` внутри монолита, только через сеть.
- Монолит проксирует создание бронирования в `booking-service` через уже готовый `com.hotelio.GrpcBookingService` (он был спрятан внутри `libs/p-o-y-1.0.0.jar` и включается сам через переменные окружения `BOOKING_SERVICE_EXTERNAL_HOST/PORT`). `BookingController` явно разведён на два бина: `GET /api/bookings` идёт в старый `bookingService` (старая БД, как и было), `POST /api/bookings` — в `grpcBookingService`.
- После сохранения бронирования `booking-service` публикует в Kafka событие `BookingCreated`.
- `booking-history-service` слушает эти события и складывает их в свою таблицу `booking_history`, в отдельной базе. Он никак не трогает боевую БД монолита — то, что просил отдел аналитики.

## Стратегия миграции данных

### Как сейчас (As-Is)

Новых данных, попавших только что через `booking-service`, ещё нет ни в одной "общей" базе — они лежат в своей `booking-db`. Старые бронирования (всё, что было создано до этой задачи) остались только в старой БД монолита `hotelio-db` и никуда не переносились. Иначе говоря:

- Новые брони → пишутся сразу в `booking-db` + событие в Kafka → попадают в `booking_history`.
- Старые брони → как лежали в `hotelio-db`, так и лежат, `booking-service` про них не знает.

Перенос исторических данных в этой задаче не делали — она была не про это, а про сам факт выноса. Поэтому `GET /api/bookings` в задании специально оставлен на старом пути: если бы список сразу переключили на `booking-service`, старые брони бы "пропали" из выдачи.

### Что дальше (To Be)

1. Перенести исторические строки `booking` из `hotelio-db` в `booking-db` — одноразовым скриптом (выгрузка + вставка) или через CDC (Debezium слушает WAL монолита и льёт события в Kafka, `booking-service` их разбирает и досохраняет к себе). Этот вариант обсуждался ещё в `tasks/task1/results/ADR-002-strangler-fig-booking.md` — там же объясняется, почему не стали писать сразу в обе базы (риск разъехаться при сбое одной из записей).
2. Пока перенос идёт, `booking-service` и монолит временно смотрят на разные данные — это нормально, `GET /api/bookings` в это время остаётся на старом пути.
3. После переноса переключить `GET /api/bookings` в монолите на `grpcBookingService` (сейчас он у него уже есть, просто не используется контроллером) — тогда список бронирований тоже пойдёт через `booking-service`.
4. Когда список бронирований подтверждённо работает через новый путь — убрать из монолита старый `BookingService`/`BookingRepository`/таблицу `booking` и старую логику проверок (`validateUser`/`validateHotel`), раз `booking-service` их больше не использует напрямую.
5. Дальше по плану ADR-002 — выносить Hotel и Review, потом PromoCode, потом User, чтобы `booking-service` перестал ходить за проверками в монолит по REST.

## Что лежит в этой папке

- `docker-ps.txt` — какие контейнеры подняты (`docker compose up -d --build` в `tasks/task2`).
- `regress.sh`, `init-fixtures.sql` — итоговые версии тестов (добавлено ожидание готовности `booking-service` перед тестами бронирования).
- `test-log.txt` — полный прогон `test/regress.sh` против поднятого стека — все проверки прошли, включая три негативных сценария (500).
- `booking-old.txt` — `select * from booking` в старой БД монолита (`hotelio-db`) после прогона тестов.
- `booking-new.txt` — `select * from booking` в новой БД `booking-service` (`booking-db`) после прогона тестов — видно две записи, которые реально создали тестовые POST-запросы.
- `booking-history.txt` — `select * from booking_history` в `booking-history-db` — обе записи появились после прогона тестов, событие `BookingCreated` дошло и обработалось.
- `bookings-listing.txt` — список бронирований, полученный двумя способами: REST из монолита (`/api/bookings`) и gRPC напрямую из `booking-service` (`ListBookings` через `grpcurl` с server reflection).
