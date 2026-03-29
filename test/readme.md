# ✅ Регрессионные тесты Hotelio

Этот каталог содержит **автоматические тесты**, проверяющие корректность REST API до и после миграции.  
Они помогают убедиться, что система работает стабильно при любых изменениях архитектуры или кода.

---

## 🧪 validate-before-migration.sh

Скрипт `regress.sh`:

1. Загружает тестовые данные в базу с помощью `init-fixtures.sql`
2. Вызывает все основные REST API
3. Проверяет, что ответы соответствуют ожидаемым
4. Удаляет тестовые данные после завершения

Выводит краткий лог с результатами проверок.

---

## 🧱 init-fixtures.sql

Содержит **фикстурные данные**, которые гарантированно:

- Не пересекаются с прод-данными
- Используют "префиксы" вроде `test-user-*`, `test-hotel-*` и `TESTPROMO*`
- Позволяют воспроизводить и проверять систему независимо от содержимого реальной базы

---

## 🧹 Очистка

В конце скрипта `regress.sh` автоматически вызывается cleanup, который удаляет все данные. (только для использования на тестовой базе!)

---

## 📌 Назначение

Тесты позволяют:

- Проверить, что система ведёт себя одинаково до и после миграции
- Не бояться рефакторинга или замены компонентов
- Создать основу для CI/CD автотестов

---

## 🧪 Пример запуска

**Перед тестами** должен быть поднят весь стек (например `tasks/task2`: `docker compose up -d --build`). Скрипт сам ждёт ответа монолита по `API_URL` и появления таблицы `booking` в booking-db (если заданы `BOOKING_DB_*`). При медленном старте можно увеличить ожидание: `API_WAIT_ATTEMPTS`, `API_WAIT_INTERVAL`, `BOOKING_DB_WAIT_ATTEMPTS`.

Базовый вариант (только БД монолита):

```bash
cd test/
docker build -t hotelio-tester .
docker run --rm \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=hotelio \
  -e DB_USER=hotelio \
  -e DB_PASSWORD=hotelio \
  -e API_URL=http://host.docker.internal:8084 \
  hotelio-tester
```

Задание 2 (внешний `booking-service`, отдельная БД бронирований): дополнительно передайте параметры `BOOKING_DB_*`, чтобы `regress.sh` загрузил `init-booking-fixtures.sql` в `hotelio_booking`:

```bash
docker run --rm \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=hotelio \
  -e DB_USER=hotelio \
  -e DB_PASSWORD=hotelio \
  -e API_URL=http://host.docker.internal:8084 \
  -e BOOKING_DB_HOST=host.docker.internal \
  -e BOOKING_DB_PORT=5433 \
  -e BOOKING_DB_NAME=hotelio_booking \
  -e BOOKING_DB_USER=hotelio \
  -e BOOKING_DB_PASSWORD=hotelio \
  hotelio-tester
```

