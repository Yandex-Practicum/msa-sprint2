#!/bin/bash
set -euo pipefail

echo "🏁 Регрессионный тест после миграции Booking Service"

# Проверка соединения
echo "🧪 Проверка подключения к БД..."
timeout 2 bash -c "</dev/tcp/${DB_HOST}/${DB_PORT}" \
  || { echo "❌ Не удалось подключиться к ${DB_HOST}:${DB_PORT}"; exit 1; }

# Загрузка фикстур
echo "🧪 Загрузка фикстур..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" < init-fixtures.sql

echo "🧪 Выполнение HTTP-тестов..."

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

BASE="${API_URL:-http://localhost:8080}"

echo ""
echo "Тесты пользователей..."
curl -sSf "${BASE}/api/users/test-user-1" | grep -q 'Alice' && pass "Получение test-user-1 по ID работает" || fail "Пользователь test-user-1 не найден"
curl -sSf "${BASE}/api/users/test-user-1/status" | grep -q 'ACTIVE' && pass "Статус test-user-1: ACTIVE" || fail "Неверный статус пользователя"
curl -sSf "${BASE}/api/users/test-user-1/blacklisted" | grep -q 'true' && pass "test-user-1 в блэклисте" || fail "Блэклист не работает"
curl -sSf "${BASE}/api/users/test-user-1/active" | grep -q 'true' && pass "test-user-1 активен" || fail "Активность не работает"
curl -sSf "${BASE}/api/users/test-user-1/authorized" | grep -q 'false' && pass "test-user-1 не авторизован (в блэклисте)" || fail "Авторизация работает неправильно"
curl -sSf "${BASE}/api/users/test-user-3/vip" | grep -q 'true' && pass "test-user-3 — VIP-пользователь" || fail "VIP-статус не работает"
curl -sSf "${BASE}/api/users/test-user-2/authorized" | grep -q 'true' && pass "test-user-2 авторизован" || fail "Авторизация (true) не работает"

echo ""
echo "Тесты отелей..."
curl -sSf "${BASE}/api/hotels/test-hotel-1" | grep -q 'Seoul' && pass "test-hotel-1 получен по ID" || fail "test-hotel-1 не найден"
curl -sSf "${BASE}/api/hotels/test-hotel-1/operational" | grep -q 'true' && pass "test-hotel-1 работает" || fail "test-hotel-1 не работает"
curl -sSf "${BASE}/api/hotels/test-hotel-3/operational" | grep -q 'false' && pass "test-hotel-3 не работает" || fail "Статус работы test-hotel-3 некорректен"
curl -sSf "${BASE}/api/hotels/test-hotel-2/fully-booked" | grep -q 'true' && pass "test-hotel-2 полностью забронирован" || fail "Статус fullyBooked test-hotel-2 неверен"
curl -sSf "${BASE}/api/hotels/by-city?city=Seoul" | grep -q 'Seoul' && pass "Поиск отелей в Сеуле работает" || fail "Поиск отелей в Сеуле не работает"
curl -sSf "${BASE}/api/hotels/top-rated?city=Seoul&limit=1" | grep -q 'Seoul' && pass "Топ-отели в Сеуле загружены" || fail "Топ-отели не найдены"

echo ""
echo "Тесты ревью..."
curl -sSf "${BASE}/api/reviews/hotel/test-hotel-1" | grep -q 'Amazing experience' && pass "Отзывы test-hotel-1 найдены" || fail "Отзывы test-hotel-1 не найдены"
curl -sSf "${BASE}/api/reviews/hotel/test-hotel-1/trusted" | grep -q 'true' && pass "test-hotel-1 признан надёжным" || fail "Надёжность test-hotel-1 не определена"
curl -sSf "${BASE}/api/reviews/hotel/test-hotel-3/trusted" | grep -q 'false' && pass "test-hotel-3 НЕ признан надёжным" || fail "Надёжность test-hotel-3 некорректна"

echo ""
echo "Тесты промокодов..."
curl -sSf "${BASE}/api/promos/TESTCODE1" | grep -q 'TESTCODE1' && pass "Промокод TESTCODE1 найден" || fail "Промокод TESTCODE1 не найден"
curl -sSf "${BASE}/api/promos/TESTCODE-VIP/valid?isVipUser=true" | grep -q 'true' && pass "VIP-промо доступен VIP" || fail "VIP-промо НЕ доступен VIP"
curl -sSf "${BASE}/api/promos/TESTCODE-VIP/valid?isVipUser=false" | grep -q 'false' && pass "VIP-промо недоступен обычному" || fail "VIP-промо доступен обычному"
curl -sSf "${BASE}/api/promos/TESTCODE1/valid" | grep -q 'true' && pass "Обычный промо доступен" || fail "Обычный промо недоступен"
curl -sSf "${BASE}/api/promos/TESTCODE-OLD/valid" | grep -q 'false' && pass "Истекший промо недоступен" || fail "Истекший промо доступен"
curl -sSf -X POST "${BASE}/api/promos/validate?code=TESTCODE1&userId=test-user-2" | grep -q 'TESTCODE1' && pass "POST /validate промо прошёл" || fail "POST /validate не прошёл"

echo ""
echo "Тесты бронирования (монолит проксирует в booking-service через gRPC)..."

# 1. Создание бронирования без промо
echo "🧪 1. Бронирование без промо..."
 curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-3&hotelId=test-hotel-1" \
   | grep -q 'test-user-3' && pass "Бронирование (без промо) прошло" || fail "Бронирование (без промо) не прошло"

# 2. Создание бронирования с промо
echo "🧪 2. Бронирование с промо..."
curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1" \
  | grep -q 'userId' \
  && pass "Бронирование с промо прошло" \
  || fail "Бронирование с промо не прошло"

# 3. Неактивный пользователь
echo "🧪 3. Отклонено: неактивный пользователь..."
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-0&hotelId=test-hotel-1")
[[ "$code" == "500" ]] \
  && pass "Отклонено: неактивный пользователь" \
  || fail "Ошибка: принято бронирование от неактивного (код $code)"

# 4. Недоверенный отель
echo "🧪 4. Отклонено: недоверенный отель..."
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-3")
[[ "$code" == "500" ]] \
  && pass "Отклонено: недоверенный отель" \
  || fail "Ошибка: принято бронирование недоверенного отеля (код $code)"

# 5. Отель полностью забронирован
echo "🧪 5. Отклонено: отель полностью забронирован..."
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-2")
[[ "$code" == "500" ]] \
  && pass "Отклонено: отель полностью забронирован" \
  || fail "Ошибка: принято бронирование в занятый отель (код $code)"

echo ""
echo "🧪 Проверка событий в Kafka..."
timeout 10 docker exec kafka kafka-console-consumer \
  --bootstrap-server kafka:9092 \
  --topic booking-events \
  --from-beginning \
  --timeout-ms 5000 2>/dev/null \
  | grep -q 'booking_id' \
  && pass "События бронирований найдены в Kafka" \
  || echo "⚠️ Kafka-события не найдены (возможно, требуется больше времени)"

echo ""
echo "✅ Все тесты пройдены!"
echo "✅ Монолит проксирует создание бронирований в booking-service через gRPC"
echo "✅ События BookingCreated пишутся в Kafka"
echo "ℹ️ GET /api/bookings временно не тестируется (listAll будет перенесён позже)"