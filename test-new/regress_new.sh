#!/bin/bash
set -euo pipefail

echo "🏁 Регрессионный тест после миграции и добавления appolo gateway"

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
BOOKING_SERVICE_BASE="${BOOKING_SERVICE_URL:-http://host.docker.internal:8085}"
GATEWAY_BASE="${GATEWAY_URL:-http://host.docker.internal:4000}"

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

# 1. Успешное бронирование отеля без промо
curl -sSf -X POST "${BOOKING_SERVICE_BASE}/api/bookings?userId=test-user-3&hotelId=test-hotel-1" | grep -q 'test-hotel-1' && pass "Бронирование прошло (без промо)" || fail "Бронирование (без промо) не прошло"

# 2. Успешное бронирование с промо
curl -sSf -X POST "${BOOKING_SERVICE_BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1" | grep -q 'TESTCODE1' && pass "Бронирование с промо прошло" || fail "Бронирование с промо не прошло"

# 3. Ошибка — неактивный пользователь
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BOOKING_SERVICE_BASE}/api/bookings?userId=test-user-0&hotelId=test-hotel-1")
if [[ "$code" == "500" ]]; then
  pass "Отклонено: неактивный пользователь"
else
  fail "Ошибка: сервер принял бронирование от неактивного пользователя (код $code)"
fi

# 4. Ошибка — отель не доверенный
curl -s -o /dev/null -w "%{http_code}" -X POST "${BOOKING_SERVICE_BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-3" | grep -q '500' \
  && pass "Отклонено: недоверенный отель" \
  || fail "Ошибка: сервер принял бронирование от недоверенного отеля"

# 5. Ошибка — отель полностью забронирован
curl -s -o /dev/null -w "%{http_code}" -X POST "${BOOKING_SERVICE_BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-2" | grep -q '500' \
  && pass "Отклонено: отель полностью забронирован" \
  || fail "Ошибка: сервер принял бронирование в полностью занятом отеле"
echo "✅ Все HTTP-тесты пройдены!"

# 6. Получение всех бронирований
curl -sSf "${BOOKING_SERVICE_BASE}/api/bookings" | grep -q 'test-user-2' && pass "Все бронирования получены" || fail "Бронирования не получены"

# 7. Получение бронирований пользователя
curl -sSf "${BOOKING_SERVICE_BASE}/api/bookings?userId=test-user-2" | grep -q 'test-user-2' && pass "Бронирования test-user-2 найдены" || fail "Нет бронирований test-user-2"

echo ""
echo "Тесты Apollo Gateway (GraphQL)..."

# Утилита: GraphQL-запрос через шлюз (с необязательным заголовком userid)
graphql_query() {
  local body="$1"
  local header="${2:-}"
  if [[ -n "$header" ]]; then
    curl -sSf -X POST -H "Content-Type: application/json" -H "$header" "$GATEWAY_BASE/" -d "$body"
  else
    curl -sSf -X POST -H "Content-Type: application/json" "$GATEWAY_BASE/" -d "$body"
  fi
}

# 1. Отели через шлюз (hotel-subgraph)
graphql_query '{"query":"query { hotelsByIds(ids: [\"test-hotel-1\"]) { id name city stars } }"}' \
  | grep -q 'Seoul' && pass "Шлюз: отель test-hotel-1 получен (hotelsByIds)" || fail "Шлюз: отель test-hotel-1 не получен"

# 2. Бронирования пользователя через шлюз (booking-subgraph, ACL по заголовку userid)
graphql_query '{"query":"query { bookingsByUser(userId: \"test-user-2\") { id userId hotelId promoCode } }"}' 'userid: test-user-2' \
  | grep -q 'TESTCODE1' && pass "Шлюз: бронирования test-user-2 найдены" || fail "Шлюз: бронирования test-user-2 не найдены"

# 3. Federation: бронирование -> отель (join booking + hotel subgraphs)
graphql_query '{"query":"query { bookingsByUser(userId: \"test-user-3\") { id hotel { name city } } }"}' 'userid: test-user-3' \
  | grep -q 'Seoul' && pass "Шлюз: federation бронь->отель работает" || fail "Шлюз: federation бронь->отель сломан"

# 4. Скидка из promocode-subgraph (@override discountPercent)
graphql_query '{"query":"query { bookingsByUser(userId: \"test-user-2\") { promoCode discountPercent } }"}' 'userid: test-user-2' \
  | grep -q '10' && pass "Шлюз: discountPercent подтянут из promocode-subgraph" || fail "Шлюз: discountPercent не получен"

# 5. discountInfo для брони с промо (description из monolith)
graphql_query '{"query":"query { bookingsByUser(userId: \"test-user-2\") { discountInfo { isValid finalDiscount description } } }"}' 'userid: test-user-2' \
  | grep -q 'Обычный промокод' && pass "Шлюз: discountInfo получен (description)" || fail "Шлюз: discountInfo неверен"

# 6. validatePromoCode через шлюз
graphql_query '{"query":"query { validatePromoCode(code: \"TESTCODE1\", userId: \"test-user-2\") { isValid originalDiscount finalDiscount } }"}' \
  | grep -q '10' && pass "Шлюз: validatePromoCode корректен" || fail "Шлюз: validatePromoCode неверен"

# 7. promosByCodes через шлюз
graphql_query '{"query":"query { promosByCodes(codes: [\"TESTCODE-VIP\", \"TESTCODE1\"]) { code discount vipOnly } }"}' \
  | grep -q 'TESTCODE-VIP' && pass "Шлюз: промокоды получены" || fail "Шлюз: промокоды не получены"

# 8. Ошибка ACL: запрос без заголовка userid
resp=$(curl -s -X POST -H "Content-Type: application/json" "$GATEWAY_BASE/" -d '{"query":"query { bookingsByUser(userId: \"test-user-2\") { id } }"}')
echo "$resp" | grep -q 'No user info in the Header.' && pass "Шлюз: запрос без userid отклонён" || fail "Шлюз: нет ошибки без userid"

# 9. Ошибка ACL: неверный userid в заголовке
resp=$(curl -s -X POST -H "Content-Type: application/json" -H "userid: test-user-9" "$GATEWAY_BASE/" -d '{"query":"query { bookingsByUser(userId: \"test-user-2\") { id } }"}')
echo "$resp" | grep -q 'Wrong user info.' && pass "Шлюз: неверный userid отклонён" || fail "Шлюз: неверный userid принят"

# 10. Комбинированный запрос (несколько подграфов в одном запросе)
resp=$(graphql_query '{"query":"query { hotelsByIds(ids: [\"test-hotel-1\"]) { id city } promosByCodes(codes: [\"TESTCODE1\"]) { code } }"}')
echo "$resp" | grep -q 'Seoul' && echo "$resp" | grep -q 'TESTCODE1' \
  && pass "Шлюз: комбинированный запрос работает" || fail "Шлюз: комбинированный запрос сломан"
