#!/bin/bash
set -euo pipefail

echo "🏁 Регрессионный тест до миграции Hotelio"

# Проверка соединения
echo "🧪 Проверка подключения к БД..."
timeout 2 bash -c "</dev/tcp/${DB_HOST}/${DB_PORT}" \
  || { echo "❌ Не удалось подключиться к ${DB_HOST}:${DB_PORT}"; exit 1; }

# Загрузка фикстур
echo "🧪 Загрузка фикстур..."
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" < init-fixtures.sql

BASE="${API_URL:-http://localhost:8080}"

echo "🧪 Выполнение HTTP-тестов..."

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

# Ожидание готовности API (после старта контейнера монолита)
echo "Ожидание готовности API (${BASE})..."
api_ok=0
for i in $(seq 1 30); do
  if curl -sf "${BASE}/api/users/test-user-1" >/dev/null 2>&1; then api_ok=1; break; fi
  sleep 2
done
[ "$api_ok" -eq 1 ] || { echo "❌ API ${BASE} не ответил в течение 60s"; exit 1; }

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
curl -sSf "${BASE}/api/users/test-user-3/vip" | grep -q 'true' && pass "test-user-3 - VIP-пользователь" || fail "VIP-статус не работает"

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
echo "Тесты бронирования (бронирования создаются через REST API; хранятся в монолите"
echo "до миграции или в booking-service после неё)..."
echo "NOTE: до миграции GET /api/bookings без userId фильтрует по пустому userId,"
echo "      поэтому список дополнительно проверяется с явным userId=test-user-2."

# 1. Создание бронирования (VIP, без промо) -> через monolith REST-фасад -> booking-service
resp=$(curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-3&hotelId=test-hotel-1")
echo "$resp" | grep -q 'test-hotel-1' && pass "Бронирование VIP без промо (price=80)" || fail "Бронирование (без промо) не прошло"

# 2. Создание бронирования (обычный пользователь + промо)
resp=$(curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1")
echo "$resp" | grep -q 'TESTCODE1' && pass "Бронирование с промо (price=90)" || fail "Бронирование с промо не прошло"

# 3. Получение бронирований: без userId (booking-service) или по userId (монолит до миграции)
all=$(curl -sSf "${BASE}/api/bookings")
if echo "$all" | grep -q 'test-user-2'; then
  pass "Все бронирования получены"
elif curl -sSf "${BASE}/api/bookings?userId=test-user-2" | grep -q 'test-user-2'; then
  pass "Бронирования test-user-2 получены (монолит хранит брони локально)"
else
  fail "Бронирования не получены"
fi

# 4. Асинхронная проверка: booking-history-service получил события BookingCreated из Kafka
HISTORY_API="${HISTORY_API_URL:-http://localhost:8082}"
if ! curl -s --max-time 2 "${HISTORY_API}/api/statistics" >/dev/null 2>&1; then
  echo "SKIP: booking-history-service недоступен (${HISTORY_API}) - проверка только для стека задания 2"
else
history_ok=0
for i in $(seq 1 20); do
  total=$(curl -s "${HISTORY_API}/api/statistics" | grep -o '"totalBookings":[0-9]*' | grep -o '[0-9]*' || echo "0")
  if [[ "${total:-0}" -ge 2 ]]; then
    history_ok=1
    break
  fi
  sleep 1
done
if [[ "$history_ok" == "1" ]]; then
  pass "booking-history-service записал события (totalBookings=$total)"
else
  fail "События BookingCreated не дошли до booking-history-service"
fi
fi

# 5. Ошибка — неактивный пользователь
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-0&hotelId=test-hotel-1")
if [[ "$code" == "500" ]]; then
  pass "Отклонено: неактивный пользователь"
else
  fail "Ошибка: сервер принял бронирование от неактивного пользователя (код $code)"
fi

# 7. Ошибка — отель не доверенный
curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-3" | grep -q '500' \
  && pass "Отклонено: недоверенный отель" \
  || fail "Ошибка: сервер принял бронирование от недоверенного отеля"

# 8. Ошибка — отель полностью забронирован
curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-2" | grep -q '500' \
  && pass "Отклонено: отель полностью забронирован" \
  || fail "Ошибка: сервер принял бронирование в полностью занятом отеле"
echo "✅ Все HTTP-тесты пройдены!"
