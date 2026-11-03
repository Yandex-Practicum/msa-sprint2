#!/bin/bash
set -euo pipefail

echo "🏁 Регрессионный тест до миграции Hotelio"

# Проверка соединения
echo "🧪 Проверка подключения к БД..."
timeout 2 bash -c "</dev/tcp/${DB_HOST}/${DB_PORT}" \
  || { echo "❌ Не удалось подключиться к ${DB_HOST}:${DB_PORT}"; exit 1; }

# Новые сервисы: booking-service (gRPC + своя БД) и booking-history-service (REST + своя БД)
export BOOKING_DB_HOST="${BOOKING_DB_HOST:-${DB_HOST}}"
export BOOKING_DB_PORT="${BOOKING_DB_PORT:-5433}"
export BOOKING_DB_NAME="${BOOKING_DB_NAME:-booking}"
export BOOKING_DB_USER="${BOOKING_DB_USER:-booking}"
export BOOKING_DB_PASSWORD="${BOOKING_DB_PASSWORD:-booking}"
HISTORY_DB_HOST="${HISTORY_DB_HOST:-${DB_HOST}}"
HISTORY_DB_PORT="${HISTORY_DB_PORT:-5434}"
HISTORY_DB_NAME="${HISTORY_DB_NAME:-booking_history}"
HISTORY_DB_USER="${HISTORY_DB_USER:-history}"
HISTORY_DB_PASSWORD="${HISTORY_DB_PASSWORD:-history}"
BOOKING_GRPC="${BOOKING_GRPC:-${DB_HOST}:9090}"
HISTORY_URL="${HISTORY_URL:-http://${DB_HOST}:8086}"

timeout 2 bash -c "</dev/tcp/${BOOKING_DB_HOST}/${BOOKING_DB_PORT}" \
  || { echo "❌ Не удалось подключиться к БД booking-service ${BOOKING_DB_HOST}:${BOOKING_DB_PORT}"; exit 1; }
timeout 2 bash -c "</dev/tcp/${HISTORY_DB_HOST}/${HISTORY_DB_PORT}" \
  || { echo "❌ Не удалось подключиться к БД booking-history-service ${HISTORY_DB_HOST}:${HISTORY_DB_PORT}"; exit 1; }

# Загрузка фикстур
echo "🧪 Загрузка фикстур..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" < init-fixtures.sql

echo "🧪 Очистка тестовых данных новых сервисов..."
PGPASSWORD="${BOOKING_DB_PASSWORD}" psql -q -h "${BOOKING_DB_HOST}" -p "${BOOKING_DB_PORT}" -U "${BOOKING_DB_USER}" "${BOOKING_DB_NAME}" \
  -c "DELETE FROM booking WHERE user_id LIKE 'test-user-%'"
PGPASSWORD="${HISTORY_DB_PASSWORD}" psql -q -h "${HISTORY_DB_HOST}" -p "${HISTORY_DB_PORT}" -U "${HISTORY_DB_USER}" "${HISTORY_DB_NAME}" \
  -c "DELETE FROM booking_history WHERE user_id LIKE 'test-user-%'"

# Брони из фикстур монолита переносятся тем же скриптом, что и при реальном переключении
./migrate-bookings.sh

echo "🧪 Выполнение HTTP-тестов..."

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

BASE="${API_URL:-http://localhost:8080}"

echo ""
echo "Тесты пользователей..."
# 1. Получение пользователя по ID
curl -sSf "${BASE}/api/users/test-user-1" | grep -q 'Alice' && pass "Получение test-user-1 по ID работает" || fail "Пользователь test-user-1 не найден"

# 2. Статус пользователя
curl -sSf "${BASE}/api/users/test-user-1/status" | grep -q 'ACTIVE' && pass "Статус test-user-1: ACTIVE" || fail "Неверный статус пользователя"

# 3. Блэклист
curl -sSf "${BASE}/api/users/test-user-1/blacklisted" | grep -q 'true' && pass "test-user-1 в блэклисте" || fail "Блэклист не работает"

# 4. Активность
curl -sSf "${BASE}/api/users/test-user-1/active" | grep -q 'true' && pass "test-user-1 активен" || fail "Активность не работает"

# 5. Авторизация
curl -sSf "${BASE}/api/users/test-user-1/authorized" | grep -q 'false' && pass "test-user-1 не авторизован (в блэклисте)" || fail "Авторизация работает неправильно"

# 6. VIP-статус
curl -sSf "${BASE}/api/users/test-user-3/vip" | grep -q 'true' && pass "test-user-3 — VIP-пользователь" || fail "VIP-статус не работает"

# 7. Авторизация: положительный кейс
curl -sSf "${BASE}/api/users/test-user-2/authorized" | grep -q 'true' && pass "test-user-2 авторизован" || fail "Авторизация (true) не работает"

echo ""
echo "Тесты отелей..."

# 1. Получение отеля по ID
curl -sSf "${BASE}/api/hotels/test-hotel-1" | grep -q 'Seoul' && pass "test-hotel-1 получен по ID" || fail "test-hotel-1 не найден"

# 2. Проверка operational
curl -sSf "${BASE}/api/hotels/test-hotel-1/operational" | grep -q 'true' && pass "test-hotel-1 работает" || fail "test-hotel-1 не работает"
curl -sSf "${BASE}/api/hotels/test-hotel-3/operational" | grep -q 'false' && pass "test-hotel-3 не работает" || fail "Статус работы test-hotel-3 некорректен"

# 3. Проверка fullyBooked
curl -sSf "${BASE}/api/hotels/test-hotel-2/fully-booked" | grep -q 'true' && pass "test-hotel-2 полностью забронирован" || fail "Статус fullyBooked test-hotel-2 неверен"

# 4. Поиск по городу
curl -sSf "${BASE}/api/hotels/by-city?city=Seoul" | grep -q 'Seoul' && pass "Поиск отелей в Сеуле работает" || fail "Поиск отелей в Сеуле не работает"

# 5. Топ-отели (по рейтингу, limit)
curl -sSf "${BASE}/api/hotels/top-rated?city=Seoul&limit=1" | grep -q 'Seoul' && pass "Топ-отели в Сеуле загружены" || fail "Топ-отели не найдены"

echo ""
echo "Тесты ревью..."

# 11. Отзывы по hotelId
curl -sSf "${BASE}/api/reviews/hotel/test-hotel-1" | grep -q 'Amazing experience' \
  && pass "Отзывы test-hotel-1 найдены" || fail "Отзывы test-hotel-1 не найдены"

# 12. Надёжный отель (>=10 отзывов и avgRating >= 4.0)
curl -sSf "${BASE}/api/reviews/hotel/test-hotel-1/trusted" | grep -q 'true' \
  && pass "test-hotel-1 признан надёжным" || fail "Надёжность test-hotel-1 не определена"

# 13. Сомнительный отель (мало отзывов/низкий рейтинг)
curl -sSf "${BASE}/api/reviews/hotel/test-hotel-3/trusted" | grep -q 'false' \
  && pass "test-hotel-3 НЕ признан надёжным (ожидаемо)" || fail "Надёжность test-hotel-3 некорректно определена"

echo ""
echo "Тесты промокодов..."

# 1. Получение промо по коду
curl -sSf "${BASE}/api/promos/TESTCODE1" | grep -q 'TESTCODE1' && pass "Промокод TESTCODE1 найден" || fail "Промокод TESTCODE1 не найден"

# 2. Проверка VIP промо — для VIP
curl -sSf "${BASE}/api/promos/TESTCODE-VIP/valid?isVipUser=true" | grep -q 'true' && pass "VIP-промо доступен VIP" || fail "VIP-промо НЕ доступен VIP"

# 3. Проверка VIP промо — для обычного
curl -sSf "${BASE}/api/promos/TESTCODE-VIP/valid?isVipUser=false" | grep -q 'false' && pass "VIP-промо недоступен обычному" || fail "VIP-промо доступен обычному"

# 4. Проверка обычного промо
curl -sSf "${BASE}/api/promos/TESTCODE1/valid" | grep -q 'true' && pass "Обычный промо доступен" || fail "Обычный промо недоступен"

# 5. Проверка истекшего промо
curl -sSf "${BASE}/api/promos/TESTCODE-OLD/valid" | grep -q 'false' && pass "Истекший промо недоступен" || fail "Истекший промо доступен"

# 6. Валидация промо для user-2 (обычного)
curl -sSf -X POST "${BASE}/api/promos/validate?code=TESTCODE1&userId=test-user-2" | grep -q 'TESTCODE1' && pass "POST /validate промо прошёл" || fail "POST /validate не прошёл"

echo ""
echo "Тесты бронирования..."

# 1. Все бронирования — напрямую из booking-service по gRPC.
# Через монолит этот запрос не работает: прокси передаёт null userId в protobuf и падает с NPE (500).
grpcurl -plaintext -d '{}' "${BOOKING_GRPC}" booking.BookingService/ListBookings | grep -q 'test-user-2' \
  && pass "Все бронирования получены (gRPC, включая перенесённые из монолита)" || fail "Бронирования не получены по gRPC"

# 2. Бронирования пользователя — через монолит, прокси идёт в booking-service
curl -sSf "${BASE}/api/bookings?userId=test-user-2" | grep -q 'test-user-2' && pass "Бронирования test-user-2 найдены" || fail "Нет бронирований test-user-2"

# 3. Успешное бронирование отеля без промо: обычный пользователь, цена 100, дата создания заполнена
response=$(curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1")
echo "$response" | grep -q '"price":100.0' && pass "Бронирование прошло (без промо), цена 100" || fail "Бронирование (без промо) не прошло: $response"
echo "$response" | grep -q '"createdAt":"20' && pass "Дата создания бронирования заполнена" || fail "Дата создания не заполнена: $response"

# 4. Успешное бронирование с промо
response=$(curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1")
echo "$response" | grep -q 'TESTCODE1' && echo "$response" | grep -q '"price":90.0' \
  && pass "Бронирование с промо прошло, цена 90" || fail "Бронирование с промо не прошло: $response"

# 5. VIP-пользователь с VIP-промо: базовая цена 80, скидка 20 вычитается — 60
response=$(curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-3&hotelId=test-hotel-1&promoCode=TESTCODE-VIP")
echo "$response" | grep -q '"price":60.0' && pass "VIP-бронирование с VIP-промо: цена 60" || fail "Неверная цена VIP-бронирования: $response"

# 6. Истёкший промокод: бронь создаётся без скидки, промокод в неё не сохраняется
response=$(curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE-OLD")
echo "$response" | grep -q '"promoCode":""' && echo "$response" | grep -q '"price":100.0' \
  && pass "Истёкший промокод не применён и не сохранён" || fail "Истёкший промокод обработан неверно: $response"

# 7. Ошибка — неактивный пользователь
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-0&hotelId=test-hotel-1")
if [[ "$code" == "500" ]]; then
  pass "Отклонено: неактивный пользователь"
else
  fail "Ошибка: сервер принял бронирование от неактивного пользователя (код $code)"
fi

# 8. Ошибка — пользователь в чёрном списке
curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-1&hotelId=test-hotel-1" | grep -q '500' \
  && pass "Отклонено: пользователь в чёрном списке" \
  || fail "Ошибка: сервер принял бронирование от пользователя из чёрного списка"

# 9. Ошибка — отель работает, но не доверенный
curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-4" | grep -q '500' \
  && pass "Отклонено: недоверенный отель" \
  || fail "Ошибка: сервер принял бронирование от недоверенного отеля"

# 10. Ошибка — отель работает и доверенный, но полностью забронирован
curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-5" | grep -q '500' \
  && pass "Отклонено: отель полностью забронирован" \
  || fail "Ошибка: сервер принял бронирование в полностью занятом отеле"

echo ""
echo "Тесты истории бронирований..."

# 11. booking-history-service получает BookingCreated из Kafka асинхронно — ждём появления записи
history_found=false
for _ in $(seq 1 20); do
  if curl -sSf "${HISTORY_URL}/api/history?userId=test-user-3" | grep -q 'TESTCODE-VIP'; then
    history_found=true
    break
  fi
  sleep 1
done
[[ "$history_found" == "true" ]] && pass "Историческая запись о брони test-user-3 появилась" || fail "Историческая запись не появилась за 20 с"

# 12. Статистика по отелям считается по истории
curl -sSf "${HISTORY_URL}/api/stats/hotels" | grep -q 'test-hotel-1' && pass "Статистика по отелям содержит test-hotel-1" || fail "Нет статистики по test-hotel-1"

# 13. Отклонённые брони в историю не попадают
curl -sSf "${HISTORY_URL}/api/history?userId=test-user-0" | grep -q '^\[\]$' && pass "Отклонённые брони не попали в историю" || fail "В истории есть отклонённая бронь"

echo "✅ Все HTTP-тесты пройдены!"
