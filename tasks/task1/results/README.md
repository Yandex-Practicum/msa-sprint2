# Task 1 — результаты

## Что здесь лежит

- ADR и диаграммы:
  - [`ADR-001-target-architecture.md`](ADR-001-target-architecture.md) — какие проблемы есть у монолита сейчас, общий план миграции на микросервисы, ближайшие планы, какие варианты рассматривали и какие риски видим.
  - [`ADR-002-strangler-fig-booking.md`](ADR-002-strangler-fig-booking.md) — почему первым выносим именно **BookingService** и пошаговый план, как это сделать по Strangler Fig.
  - `diagrams/` — диаграммы в формате PlantUML (стиль C4, как в `context/diagram.puml`). У каждой диаграммы есть исходник `.puml` и уже готовая картинка `.png` рядом — картинки вставлены прямо в ADR, `.puml` нужен только если картинку захочется поменять:
    - `current-state-component.puml` / `.png` — как всё устроено сейчас, внутри монолита.
    - `target-state-container.puml` / `.png` — целевая архитектура системы.
    - `intermediate-state-container.puml` / `.png` — промежуточная архитектура после выноса BookingService.
    - `booking-sequence-before.puml` / `.png` — что происходит по шагам при `POST /api/bookings` сейчас, в монолите.
    - `booking-sequence-after.puml` / `.png` — что будет происходить по шагам при `POST /api/bookings` после выноса Booking: переключение по флагу через `GrpcBookingClient` на новый Booking Service, который пока ходит за проверками обратно в монолит по REST.
- [`test-log.txt`](test-log.txt) — лог проверки монолита перед началом миграции (п.7 задания): подняли приложение (`docker compose up`), посмотрели, что контейнеры работают (`docker ps`), проверили API через `curl` и прогнали `test/regress.sh` — все проверки прошли (`✅ Все HTTP-тесты пройдены!`).

## Как перегенерировать картинки диаграмм

Картинки (`.png`) в `diagrams/` — это просто отрендеренные версии файлов `.puml`. Если поменяли `.puml`, картинку нужно пересобрать. Проще всего — через Docker, без установки PlantUML на компьютер:

```bash
cd tasks/task1/results/diagrams
docker run --rm -v "$(pwd)":/data plantuml/plantuml -tpng /data
```

Эта команда возьмёт все `.puml` файлы в папке и положит рядом такие же по названию `.png`. Если Docker недоступен, можно так же:
- открыть `.puml` файл плагином PlantUML в IntelliJ IDEA / VS Code и экспортировать картинку;
- вставить содержимое `.puml` на https://www.plantuml.com/plantuml и скачать картинку оттуда.

## Проверка перед началом работы (п.7 задания) — сделано

Подняли монолит и базу с чистого состояния (`docker compose down -v`, потом `up -d --build`), проверили API и прогнали весь набор тестов `test/regress.sh` на текущем монолите. Полный вывод — в [`test-log.txt`](test-log.txt).

```bash
docker network create hotelio-net   # если сеть ещё не создана
cd tasks/task1
docker compose up -d --build
curl http://localhost:8084/api/bookings   # реальный путь контроллера, не /bookings — см. ниже

cd ../../test
docker build -t hotelio-tester .
docker run --rm --network hotelio-net \
  -e DB_HOST=hotelio-db \
  -e DB_PORT=5432 \
  -e DB_NAME=hotelio \
  -e DB_USER=hotelio \
  -e DB_PASSWORD=hotelio \
  -e API_URL=http://hotelio-monolith:8080 \
  hotelio-tester
```

Результат: `hotelio-monolith` и `hotelio-db` поднялись, и все проверки в `test/regress.sh` прошли (`✅ Все HTTP-тесты пройдены!`) — пользователи, отели, отзывы, промокоды, создание и получение бронирований, а ещё "плохие" сценарии (неактивный пользователь, отель без доверия/переполненный отель), которые специально должны заканчиваться ошибкой HTTP 500 — почему так, написано в `test-log.txt`. После проверки контейнеры остановили (`docker compose down`).

Замечания:

- В `tasks/task1/docker-compose.yml` и `architecture/readme.md` для проверки предлагают адрес `/bookings`, но на самом деле контроллер висит на `/api/bookings` (`BookingController` в коде размечен как `@RequestMapping("/api/bookings")`). Поэтому `curl http://localhost:8084/bookings` отвечает 404 — это не что-то сломанное, а просто неточность в тексте задания.
- На Linux адрес `host.docker.internal` без дополнительной настройки не работает, поэтому тестовый контейнер запускали в той же docker-сети (`--network hotelio-net`) и обращались к сервисам по их именам (`hotelio-db`, `hotelio-monolith:8080`), а не через `host.docker.internal`.
- Оба Dockerfile, которые нужны были для запуска, ссылались на **образы, которых больше нет на Docker Hub** (это не связано с самой миграцией — просто старые образы устарели и их убрали). Без правки теги не находились, и сборка падала ещё на шаге `docker pull`:
  - `tasks/monolith/Dockerfile`: `openjdk:17-jdk-slim` → `eclipse-temurin:17-jdk-jammy` (официальные образы `openjdk` больше не поддерживаются, старые версии удалены; Eclipse Temurin — их прямая замена, та же Java 17).
  - `test/Dockerfile`: `debian:bullseye-slim` → `debian:bookworm-slim` (Debian 11 больше не обновляется, из-за этого `apt-get install` падал с ошибкой 404).
  - Это правки только версии базового образа для сборки — на код монолита и тестов они не влияют.
