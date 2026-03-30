#!/usr/bin/env bash
set -euo pipefail

# Task2 regression: Monolith -> gRPC booking-service -> Kafka -> booking-history
# Запуск (Git Bash/WSL, Docker Desktop):
#   bash tasks/task2/results/regress.sh

# --------- Paths ---------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"           # tasks/task2
RESULTS_DIR="$WORK_DIR/results"
PROTO="$WORK_DIR/booking.proto"
REPO_ROOT="$(cd "$WORK_DIR/../.." && pwd)"        # корень репозитория
FIXTURES="$REPO_ROOT/test/init-fixtures.sql"
LOG="$RESULTS_DIR/test-log.txt"

# --------- Config (override via env) ---------
API_URL="${API_URL:-http://localhost:8084}"         # монолит опубликован на 8084
NETWORK="${NETWORK:-hotelio-net}"
GRPC_ADDR="${GRPC_ADDR:-booking-service:9090}"
MONO_DB_CONT="${MONO_DB_CONT:-hotelio-db}"
BOOKING_DB_CONT="${BOOKING_DB_CONT:-booking-db}"
HISTORY_DB_CONT="${HISTORY_DB_CONT:-history-db}"

# --------- Helpers ---------
header() { echo -e "\n# $*" | tee -a "$LOG"; }
cmd()    { echo "$ $*" | tee -a "$LOG"; "$@" | tee -a "$LOG"; echo | tee -a "$LOG"; }

# Docker binary + безопасный путь для -v под Git Bash
DOCKER_BIN="${DOCKER_BIN:-docker}"
command -v docker.exe >/dev/null 2>&1 && DOCKER_BIN="docker.exe"
if command -v cygpath >/dev/null 2>&1; then
  WORK_VOL="$(cygpath -w "$WORK_DIR")"   # C:\...\tasks\task2
else
  WORK_VOL="$WORK_DIR"
fi

mkdir -p "$RESULTS_DIR"
echo "Дата: $(date -Iseconds)" | tee -a "$LOG"

# --------- Preflight ---------
header "Проверка контейнеров"
echo "$ $DOCKER_BIN ps --format {{.Names}}\t{{.Image}}\t{{.Status}}" | tee -a "$LOG"
$DOCKER_BIN ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | tee "$RESULTS_DIR/docker-ps.txt" | tee -a "$LOG" >/dev/null

# --------- Fixtures ---------
header "Загрузка тестовых фикстур в монолитную БД"
if [[ -f "$FIXTURES" ]]; then
  echo "$ $DOCKER_BIN exec -i $MONO_DB_CONT psql -U hotelio -d hotelio -f - < \"$FIXTURES\"" | tee -a "$LOG"
  $DOCKER_BIN exec -i "$MONO_DB_CONT" psql -U hotelio -d hotelio -f - < "$FIXTURES" | tee -a "$LOG"
else
  echo "⚠️  Не найден $FIXTURES — пропускаю загрузку" | tee -a "$LOG"
fi

# --------- Create bookings via monolith (REST) ---------
header "Создание бронирований через монолит (REST)"
cmd curl -sS -X POST "${API_URL}/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1"
cmd curl -sS -X POST "${API_URL}/api/bookings?userId=test-user-3&hotelId=test-hotel-1&promoCode=TESTCODE-VIP"

# --------- REST listings from monolith ---------
header "REST: список бронирований user-2"
cmd curl -sS "${API_URL}/api/bookings?userId=test-user-2"
header "REST: список бронирований user-3"
cmd curl -sS "${API_URL}/api/bookings?userId=test-user-3"

# --------- gRPC listings from booking-service ---------
header "gRPC: список бронирований через grpcurl"
# Подготовим JSON-запросы
printf '{"user_id":"test-user-2"}' > "$WORK_DIR/user2.json"
printf '{"user_id":"test-user-3"}' > "$WORK_DIR/user3.json"

set +e
env MSYS_NO_PATHCONV=1 \ 
$DOCKER_BIN run --rm --network="$NETWORK" -v "$WORK_VOL:/work" fullstorydev/grpcurl \
  -plaintext -import-path /work -proto /work/booking.proto -d "@/work/user2.json" "$GRPC_ADDR" booking.BookingService/ListBookings | tee -a "$LOG"
GRPC1=$?
env MSYS_NO_PATHCONV=1 \ 
$DOCKER_BIN run --rm --network="$NETWORK" -v "$WORK_VOL:/work" fullstorydev/grpcurl \
  -plaintext -import-path /work -proto /work/booking.proto -d "@/work/user3.json" "$GRPC_ADDR" booking.BookingService/ListBookings | tee -a "$LOG"
GRPC2=$?
set -e

if [[ $GRPC1 -ne 0 || $GRPC2 -ne 0 ]]; then
  header "gRPC fallback: клиент внутри контейнера"
  cmd $DOCKER_BIN cp "$WORK_DIR/booking-service/grpc-client.js" booking-service:/app/grpc-client.js || true
  cmd env MSYS_NO_PATHCONV=1 $DOCKER_BIN exec booking-service node /app/grpc-client.js test-user-2 || true
  cmd env MSYS_NO_PATHCONV=1 $DOCKER_BIN exec booking-service node /app/grpc-client.js test-user-3 || true
fi

# --------- DB snapshots ---------
header "Снимки таблиц после тестов"
echo "-- booking-db.booking" > "$RESULTS_DIR/select-booking-db.txt"
$DOCKER_BIN exec -i "$BOOKING_DB_CONT" psql -U booking -d booking -c "select * from booking order by id" >> "$RESULTS_DIR/select-booking-db.txt" || true

echo "-- history-db.booking_history" > "$RESULTS_DIR/select-history-db.txt"
$DOCKER_BIN exec -i "$HISTORY_DB_CONT" psql -U history -d history -c "select * from booking_history order by id" >> "$RESULTS_DIR/select-history-db.txt" || true

echo "-- monolith-db.booking" > "$RESULTS_DIR/select-monolith-db.txt"
$DOCKER_BIN exec -i "$MONO_DB_CONT" psql -U hotelio -d hotelio -c "select * from booking order by id" >> "$RESULTS_DIR/select-monolith-db.txt" || true

header "Результат"
echo "Логи команд и вывод: $LOG" | tee -a "$LOG"
echo "Docker ps: $RESULTS_DIR/docker-ps.txt" | tee -a "$LOG"
echo "SELECT booking (новая БД): $RESULTS_DIR/select-booking-db.txt" | tee -a "$LOG"
echo "SELECT booking_history: $RESULTS_DIR/select-history-db.txt" | tee -a "$LOG"
echo "SELECT booking (монолит): $RESULTS_DIR/select-monolith-db.txt" | tee -a "$LOG"
echo "✅ Готово" | tee -a "$LOG"
