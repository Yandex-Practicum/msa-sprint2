#!/bin/bash
# Перенос бронирований из таблицы booking монолита в БД booking-service (стратегия данных из ADR).
# Идентификаторы сохраняются, уже перенесённые брони пропускаются, поэтому скрипт можно запускать повторно:
# основной проход до переключения, догоняющий — сразу после.
set -euo pipefail

# Запас номеров: брони, созданные в монолите в окне переключения, не пересекутся с новыми бронями сервиса.
ID_GAP="${ID_GAP:-1000}"

SOURCE="host=${DB_HOST} port=${DB_PORT} dbname=${DB_NAME} user=${DB_USER} password=${DB_PASSWORD}"
TARGET="host=${BOOKING_DB_HOST} port=${BOOKING_DB_PORT} dbname=${BOOKING_DB_NAME} user=${BOOKING_DB_USER} password=${BOOKING_DB_PASSWORD}"

echo "🚚 Перенос бронирований монолита в booking-service..."

psql "${SOURCE}" -v ON_ERROR_STOP=1 -q \
  -c "\copy (SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at FROM booking ORDER BY id) TO STDOUT" \
| psql "${TARGET}" -v ON_ERROR_STOP=1 -q \
  -c "CREATE TEMP TABLE booking_import (LIKE booking)" \
  -c "\copy booking_import (id, user_id, hotel_id, promo_code, discount_percent, price, created_at) FROM PSTDIN" \
  -c "INSERT INTO booking SELECT * FROM booking_import ON CONFLICT (id) DO NOTHING" \
  -c "SELECT setval('booking_id_seq', GREATEST((SELECT last_value FROM booking_id_seq), (SELECT COALESCE(MAX(id), 0) FROM booking_import) + ${ID_GAP}))" \
  -c "SELECT COUNT(*) AS imported FROM booking_import" \
  -c "SELECT COUNT(*) AS total_in_booking_service FROM booking"
