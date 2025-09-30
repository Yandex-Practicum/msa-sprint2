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

```bash
cd test/
docker build -t hotelio-tester .
docker run --rm \
  --network hotelio-net \
  -e DB_HOST=hotelio-db \
  -e DB_PORT=5432 \
  -e DB_NAME=hotelio \
  -e DB_USER=hotelio \
  -e DB_PASSWORD=hotelio \
  -e API_URL=http://host.docker.internal:8084 \
  hotelio-tester
```


```bash
cd test/
docker build -t hotelio-tester .
docker run --rm \
  --network hotelio-net \
  -e DB_HOST=hotelio-db \
  -e DB_PORT=5432 \
  -e DB_NAME=hotelio \
  -e DB_USER=hotelio \
  -e DB_PASSWORD=hotelio \
  -e DB_BOOKING_HOST=hotelio-booking-db \
  -e DB_BOOKING_PORT=5432 \
  -e DB_BOOKING_NAME=booking_db \
  -e DB_BOOKING_USER=booking_user \
  -e DB_BOOKING_PASSWORD=booking_pass \
  -e API_URL=http://host.docker.internal:8084 \
  hotelio-tester
```

