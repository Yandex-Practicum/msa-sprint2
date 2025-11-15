#!/bin/bash
set -euo pipefail

echo "🏁 Регрессионный тест (task2) Hotelio"

# ------- ПАРАМЕТРЫ ОКРУЖЕНИЯ -------
# Монолит (HTTP API, проксирует create в gRPC)
BASE="${API_URL:-http://localhost:8084}"

# БД монолита (для фикстур пользователей/отелей)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-hotelio}"
DB_PASSWORD="${DB_PASSWORD:-hotelio}"
DB_NAME="${DB_NAME:-hotelio}"

# Контейнер с историей бронирований (Postgres)
HIST_DB_CONT="${HIST_DB_CONT:-task2-booking-history-db-1}"
HIST_DB_USER="${HIST_DB_USER:-booking_history}"
HIST_DB_NAME="${HIST_DB_NAME:-booking_history}"

# ------- ХЕЛПЕРЫ -------
pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

# ------- ПРОВЕРКА ДОСТУПНОСТИ БД (если нужен прогон init-fixtures.sql) -------
if [[ -f "init-fixtures.sql" ]]; then
  echo "🧪 Проверка подключения к БД монолита..."
  if timeout 2 bash -c "</dev/tcp/${DB_HOST}/${DB_PORT}"; then
    echo "🧪 Загрузка фикстур в БД монолита..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" < init-fixtures.sql
  else
    echo "⚠️  БД монолита недоступна на ${DB_HOST}:${DB_PORT}. Пропускаю загрузку фикстур."
  fi
fi

echo ""
echo "=== Тесты пользователей ==="
curl -sSf "${BASE}/api/users/user-001"            | grep -q '"id":"user-001"' && pass "GET /api/users/user-001" || fail "user-001 не найден"
curl -sSf "${BASE}/api/users/user-001/active"     | grep -q 'true'             && pass "user-001 активен"      || fail "user-001 не активен"
curl -sSf "${BASE}/api/users/user-001/authorized" | grep -q 'true'             && pass "user-001 авторизован"  || fail "user-001 не авторизован"

echo ""
echo "=== Тесты отелей ==="
curl -sSf "${BASE}/api/hotels/hotel-777"              | grep -q '"id":"hotel-777"' && pass "GET /api/hotels/hotel-777" || fail "hotel-777 не найден"
curl -sSf "${BASE}/api/hotels/hotel-777/operational"  | grep -q 'true'             && pass "hotel-777 работает"       || fail "hotel-777 не работает"
curl -sSf "${BASE}/api/hotels/hotel-777/fully-booked" | grep -q 'false'            && pass "hotel-777 не переполнен"  || fail "hotel-777 переполнен"

echo ""
echo "=== Тесты бронирований ==="
# 1) Создание бронирования (через монолит → gRPC → booking-service; ожидаем 200 + JSON с указанными id)
resp="$(curl -sSf -X POST "${BASE}/api/bookings?userId=user-001&hotelId=hotel-777")"
echo "$resp" | grep -q '"userId":"user-001"' && echo "$resp" | grep -q '"hotelId":"hotel-777"' \
  && pass "POST /api/bookings (user-001, hotel-777)" \
  || fail "Создание бронирования не вернуло ожидаемый ответ"

# 2) Листинг бронирований
curl -sSf "${BASE}/api/bookings?userId=user-001" | grep -q 'hotel-777' \
  && pass "GET /api/bookings?userId=user-001" \
  || fail "Не найдено бронирование user-001"

# 3) Проверка, что событие попало в Kafka и обработано booking-history-service:
#    читаем агрегатную таблицу booking_stats (user_id, total_bookings) из контейнера истории
echo ""
echo "=== Проверка booking-history ==="
docker exec "${HIST_DB_CONT}" psql -U "${HIST_DB_USER}" -d "${HIST_DB_NAME}" -c \
  "SELECT user_id, total_bookings FROM booking_stats ORDER BY user_id;" | tee /tmp/booking_stats.out >/dev/null

grep -q "user-001" /tmp/booking_stats.out \
  && pass "История бронирований зафиксирована (booking_stats содержит user-001)" \
  || fail "В booking_history.booking_stats нет записей для user-001"

echo ""
pass "Все проверки пройдены!"
