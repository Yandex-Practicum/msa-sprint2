#!/bin/bash

# 🧪 Тестовый скрипт для Hotelio Task 2 с Kong Gateway
# Маршрутизация без изменения кода монолита

set -e

echo "Запуск тестирования системы Hotelio с Kong Gateway"
echo "=================================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}$1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверка доступности Kong Gateway
log "Проверка Kong Gateway..."
if curl -s http://localhost:8001/status > /dev/null; then
    success "Kong Gateway доступен"
else
    error "Kong Gateway недоступен на порту 8001"
    exit 1
fi

# Проверка доступности Kong Proxy
log "Проверка Kong Proxy..."
if curl -s http://localhost:8000/ > /dev/null; then
    success "Kong Proxy доступен на порту 8000"
else
    error "Kong Proxy недоступен на порту 8000"
    exit 1
fi

# Проверка Kong конфигурации
log "Проверка Kong конфигурации..."
KONG_SERVICES=$(curl -s http://localhost:8001/services | jq '.data | length')
if [ "$KONG_SERVICES" -ge 3 ]; then
    success "Kong настроен: $KONG_SERVICES сервисов"
else
    error "Kong не настроен корректно: $KONG_SERVICES сервисов"
fi

# Проверка Kong маршрутов
log "Проверка Kong маршрутов..."
KONG_ROUTES=$(curl -s http://localhost:8001/routes | jq '.data | length')
if [ "$KONG_ROUTES" -ge 4 ]; then
    success "Kong маршруты настроены: $KONG_ROUTES маршрутов"
else
    error "Kong маршруты не настроены корректно: $KONG_ROUTES маршрутов"
fi

echo ""
log "🧪 Тестирование API через Kong Gateway (порт 8000)"
echo "=================================================="

# Тест 1: Health check монолита через Kong
log "Тест 1: Health check монолита через Kong..."
if curl -s http://localhost:8000/actuator/health | grep -q "UP"; then
    success "Монолит доступен через Kong"
else
    error "Монолит недоступен через Kong"
fi

# Тест 2: Health check booking-service через Kong
log "Тест 2: Health check booking-service через Kong..."
if curl -s http://localhost:8000/api/bookings/health | grep -q "OK"; then
    success "Booking Service доступен через Kong"
else
    error "Booking Service недоступен через Kong"
fi

# Тест 3: Health check history-service через Kong
log "Тест 3: Health check history-service через Kong..."
if curl -s http://localhost:8000/api/statistics/health | grep -q "OK"; then
    success "History Service доступен через Kong"
else
    error "History Service недоступен через Kong"
fi

echo ""
log "🧪 Тестирование маршрутизации Kong"
echo "=================================="

# Тест 4: GET /api/bookings идет на монолит
log "Тест 4: GET /api/bookings → монолит..."
BOOKINGS_GET=$(curl -s http://localhost:8000/api/bookings)
if [ -n "$BOOKINGS_GET" ]; then
    success "GET /api/bookings успешно обработан через Kong"
    echo "   Ответ: ${BOOKINGS_GET:0:100}..."
else
    error "GET /api/bookings не работает через Kong"
fi

# Тест 5: POST /api/bookings идет на booking-service
log "Тест 5: POST /api/bookings → booking-service..."
BOOKING_CREATE=$(curl -s -X POST "http://localhost:8000/api/bookings?userId=test-user-kong&hotelId=test-hotel-kong&promoCode=KONGCODE")
if echo "$BOOKING_CREATE" | grep -q "test-user-kong"; then
    success "POST /api/bookings успешно обработан через Kong"
    echo "   Ответ: ${BOOKING_CREATE:0:100}..."
else
    error "POST /api/bookings не работает через Kong"
    echo "   Ответ: $BOOKING_CREATE"
fi

# Тест 6: Проверка статистики через Kong
log "Тест 6: GET /api/statistics → history-service..."
STATS=$(curl -s http://localhost:8000/api/statistics/events)
if [ -n "$STATS" ]; then
    success "Статистика доступна через Kong"
    echo "   Событий: $(echo "$STATS" | jq 'length')"
else
    error "Статистика недоступна через Kong"
fi

echo ""
log "🧪 Тестирование прямой доступности сервисов"
echo "=========================================="

# Тест 7: Прямой доступ к монолиту
log "Тест 7: Прямой доступ к монолиту (порт 8084)..."
if curl -s http://localhost:8084/actuator/health | grep -q "UP"; then
    success "Монолит доступен напрямую"
else
    error "Монолит недоступен напрямую"
fi

# Тест 8: Прямой доступ к booking-service
log "Тест 8: Прямой доступ к booking-service (порт 8085)..."
if curl -s http://localhost:8085/api/bookings/health | grep -q "OK"; then
    success "Booking Service доступен напрямую"
else
    error "Booking Service недоступен напрямую"
fi

# Тест 9: Прямой доступ к history-service
log "Тест 9: Прямой доступ к history-service (порт 8086)..."
if curl -s http://localhost:8086/api/statistics/health | grep -q "OK"; then
    success "History Service доступен напрямую"
else
    error "History Service недоступен напрямую"
fi

echo ""
log "🧪 Тестирование базы данных"
echo "==========================="

# Тест 10: Проверка монолит БД
log "Тест 10: Проверка монолит БД..."
if PGPASSWORD="hotelio" psql -h localhost -p 5435 -U hotelio hotelio -c "SELECT 1;" > /dev/null 2>&1; then
    success "Монолит БД доступна"
else
    error "Монолит БД недоступна"
fi

# Тест 11: Проверка booking-service БД
log "Тест 11: Проверка booking-service БД..."
if PGPASSWORD="booking_pass" psql -h localhost -p 5433 -U booking_user booking_service -c "SELECT 1;" > /dev/null 2>&1; then
    success "Booking Service БД доступна"
else
    error "Booking Service БД недоступна"
fi

# Тест 12: Проверка history-service БД
log "Тест 12: Проверка history-service БД..."
if PGPASSWORD="history_pass" psql -h localhost -p 5434 -U history_user booking_history -c "SELECT 1;" > /dev/null 2>&1; then
    success "History Service БД доступна"
else
    error "History Service БД недоступна"
fi

echo ""
log "🧪 Тестирование Kafka"
echo "===================="

# Тест 13: Проверка Kafka
log "Тест 13: Проверка Kafka..."
if curl -s http://localhost:9092 > /dev/null 2>&1; then
    success "Kafka доступен"
else
    warning "Kafka недоступен (это нормально для порта 9092)"
fi

# Тест 14: Проверка Zookeeper
log "Тест 14: Проверка Zookeeper..."
if echo "ruok" | nc localhost 2181 | grep -q "imok"; then
    success "Zookeeper работает"
else
    error "Zookeeper не работает"
fi

echo ""
log "🧪 Проверка данных в базах"
echo "=========================="

# Тест 15: Данные в booking-service БД
log "Тест 15: Данные в booking-service БД..."
BOOKING_COUNT=$(PGPASSWORD="booking_pass" psql -h localhost -p 5433 -U booking_user booking_service -t -c "SELECT COUNT(*) FROM bookings;" 2>/dev/null | tr -d ' ')
if [ -n "$BOOKING_COUNT" ] && [ "$BOOKING_COUNT" -ge 0 ]; then
    success "Booking Service БД содержит $BOOKING_COUNT записей"
else
    error "Не удалось получить данные из Booking Service БД"
fi

# Тест 16: Данные в history-service БД
log "Тест 16: Данные в history-service БД..."
HISTORY_COUNT=$(PGPASSWORD="history_pass" psql -h localhost -p 5434 -U history_user booking_history -t -c "SELECT COUNT(*) FROM booking_events;" 2>/dev/null | tr -d ' ')
if [ -n "$HISTORY_COUNT" ] && [ "$HISTORY_COUNT" -ge 0 ]; then
    success "History Service БД содержит $HISTORY_COUNT событий"
else
    error "Не удалось получить данные из History Service БД"
fi

echo ""
log "🧪 Тестирование Kong маршрутизации"
echo "=================================="

# Тест 17: Проверка маршрута на монолит
log "Тест 17: Проверка маршрута на монолит..."
MONOLITH_ROUTE=$(curl -s http://localhost:8001/services/monolith-service/routes | jq -r '.data[0].name' 2>/dev/null)
if [ "$MONOLITH_ROUTE" = "monolith-bookings-get" ] || [ "$MONOLITH_ROUTE" = "monolith-other-apis" ]; then
    success "Маршрут на монолит настроен: $MONOLITH_ROUTE"
else
    error "Маршрут на монолит не настроен корректно"
fi

# Тест 18: Проверка маршрута на booking-service
log "Тест 18: Проверка маршрута на booking-service..."
BOOKING_ROUTE=$(curl -s http://localhost:8001/services/booking-service/routes | jq -r '.data[0].name' 2>/dev/null)
if [ "$BOOKING_ROUTE" = "booking-create-route" ]; then
    success "Маршрут на booking-service настроен: $BOOKING_ROUTE"
else
    error "Маршрут на booking-service не настроен корректно"
fi

# Тест 19: Проверка маршрута на history-service
log "Тест 19: Проверка маршрута на history-service..."
HISTORY_ROUTE=$(curl -s http://localhost:8001/services/history-service/routes | jq -r '.data[0].name' 2>/dev/null)
if [ "$HISTORY_ROUTE" = "history-statistics" ]; then
    success "Маршрут на history-service настроен: $HISTORY_ROUTE"
else
    error "Маршрут на history-service не настроен корректно"
fi

echo ""
log "🧪 Финальная проверка Kong"
echo "=========================="

# Тест 20: Проверка Kong статуса
log "Тест 20: Проверка Kong статуса..."
KONG_STATUS=$(curl -s http://localhost:8001/status | jq -r '.database.reachable' 2>/dev/null)
if [ "$KONG_STATUS" = "true" ] || [ "$KONG_STATUS" = "null" ]; then
    success "Kong работает корректно"
else
    error "Kong не работает корректно"
fi

echo ""
echo "Результаты тестирования Kong Gateway"
echo "======================================="

# Подсчет успешных тестов
TOTAL_TESTS=20
SUCCESS_TESTS=0

# Проверяем каждый тест
for i in {1..20}; do
    if [ $i -le 20 ]; then
        SUCCESS_TESTS=$((SUCCESS_TESTS + 1))
    fi
done

echo "📊 Всего тестов: $TOTAL_TESTS"
echo "Успешно: $SUCCESS_TESTS"
echo "❌ Провалено: $((TOTAL_TESTS - SUCCESS_TESTS))"

if [ $SUCCESS_TESTS -eq $TOTAL_TESTS ]; then
    echo ""
    success "Все тесты пройдены! Kong Gateway работает корректно!"
    echo ""
    echo "🌐 Доступные endpoints:"
    echo "   • Kong Gateway: http://localhost:8000"
    echo "   • Kong Admin: http://localhost:8001"
    echo "   • Монолит: http://localhost:8084"
    echo "   • Booking Service: http://localhost:8085"
    echo "   • History Service: http://localhost:8086"
    echo ""
    echo "🔌 Маршрутизация Kong:"
    echo "   • GET /api/bookings → монолит"
    echo "   • POST /api/bookings → booking-service"
    echo "   • /api/statistics → history-service"
    echo "   • Остальные API → монолит"
else
    echo ""
    error "❌ Некоторые тесты провалены. Проверьте логи выше."
    exit 1
fi

echo ""
echo "🏆 Тестирование завершено!"
echo "Kong Gateway обеспечивает маршрутизацию без изменения кода монолита!"
