#!/bin/bash
set -euo pipefail

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

echo "🏁 Регресс booking-service (gRPC → Kafka → Postgres)"

BOOKING_HOST="${BOOKING_SERVICE_HOST:-booking-service}"
BOOKING_PORT="${BOOKING_SERVICE_PORT:-9090}"

DB_HOST="${DB_HOST:-booking-history-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-booking_history}"
DB_USER="${DB_USER:-history}"
DB_PASSWORD="${DB_PASSWORD:-history}"

export BOOKING_GRPC_TARGET="${BOOKING_HOST}:${BOOKING_PORT}"
export N="${N:-5}"

# ---------------------------
# Ждём Postgres через psql
# ---------------------------
echo "🧪 Ждём Postgres ${DB_HOST}:${DB_PORT}..."

for i in $(seq 20); do
  if PGPASSWORD="${DB_PASSWORD}" \
     psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" \
     -c "select 1" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

PGPASSWORD="${DB_PASSWORD}" \
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" \
-c "select 1" >/dev/null 2>&1 \
|| fail "Postgres недоступен"

pass "Postgres доступен"

# ---------------------------
# Запускаем gRPC client
# ---------------------------
echo "🧪 Создаём бронирования через client.py..."

python3 -u /work/app/client.py \
  && pass "client.py успешно отработал" \
  || fail "client.py упал"

# ---------------------------
# Проверяем запись в БД
# ---------------------------
echo "🧪 Проверяем записи в booking-history-db..."
sleep 2

COUNT=$(PGPASSWORD="${DB_PASSWORD}" \
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" \
  -t -c "select count(*) from bookings;" | tr -d '[:space:]')

[[ "${COUNT}" =~ ^[0-9]+$ ]] || fail "Не удалось получить count"

if [ "${COUNT}" -gt 0 ]; then
  pass "bookings count=${COUNT}"
else
  fail "В таблице bookings 0 записей"
fi

echo "🎉 Регресс успешно пройден"