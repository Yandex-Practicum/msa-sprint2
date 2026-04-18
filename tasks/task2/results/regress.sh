#!/bin/bash
set -euo pipefail

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

BASE="${API_URL:-http://localhost:8084}"

MAIN_DB_CONTAINER="${MAIN_DB_CONTAINER:-hotelio-db}"
MAIN_DB_NAME="${MAIN_DB_NAME:-hotelio}"
MAIN_DB_USER="${MAIN_DB_USER:-hotelio}"

HISTORY_DB_CONTAINER="${HISTORY_DB_CONTAINER:-booking-history-db}"
HISTORY_DB_NAME="${HISTORY_DB_NAME:-bookinghistory}"
HISTORY_DB_USER="${HISTORY_DB_USER:-history}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_FIXTURES="${INIT_FIXTURES:-${SCRIPT_DIR}/../init-fixtures.sql}"

echo "🏁 Регрессионный тест ПОСЛЕ миграции Hotelio"
echo "🧪 Базовый URL монолита: ${BASE}"
echo "🧪 Основная БД: container=${MAIN_DB_CONTAINER}, db=${MAIN_DB_NAME}, user=${MAIN_DB_USER}"
echo "🧪 Историческая БД: container=${HISTORY_DB_CONTAINER}, db=${HISTORY_DB_NAME}, user=${HISTORY_DB_USER}"
echo ""

echo "🧪 Проверка доступности монолита..."
curl -sSf "${BASE}/api/hotels/test-hotel-1" > /dev/null \
  && pass "Монолит доступен" \
  || fail "Монолит недоступен"

echo ""
echo "🧪 Загрузка фикстур..."
[ -f "${INIT_FIXTURES}" ] || fail "Файл фикстур не найден: ${INIT_FIXTURES}"

docker exec -i "${MAIN_DB_CONTAINER}" psql -U "${MAIN_DB_USER}" -d "${MAIN_DB_NAME}" < "${INIT_FIXTURES}" \
  && pass "Фикстуры загружены" \
  || fail "Не удалось загрузить фикстуры"

echo ""
echo "🧪 Очистка history-таблицы..."
docker exec -i "${HISTORY_DB_CONTAINER}" psql -U "${HISTORY_DB_USER}" -d "${HISTORY_DB_NAME}" -c "TRUNCATE TABLE booking_history;" > /dev/null \
  && pass "Историческая таблица очищена" \
  || fail "Не удалось очистить booking_history"

echo ""
echo "Тесты пользователей..."
curl -sSf "${BASE}/api/users/test-user-1" | grep -q 'Alice' \
  && pass "Получение test-user-1 по ID работает" \
  || fail "Пользователь test-user-1 не найден"

curl -sSf "${BASE}/api/users/test-user-1/status" | grep -q 'ACTIVE' \
  && pass "Статус test-user-1: ACTIVE" \
  || fail "Неверный статус пользователя"

curl -sSf "${BASE}/api/users/test-user-1/blacklisted" | grep -q 'true' \
  && pass "test-user-1 в блэклисте" \
  || fail "Блэклист не работает"

curl -sSf "${BASE}/api/users/test-user-1/active" | grep -q 'true' \
  && pass "test-user-1 активен" \
  || fail "Активность не работает"

curl -sSf "${BASE}/api/users/test-user-1/authorized" | grep -q 'false' \
  && pass "test-user-1 не авторизован (в блэклисте)" \
  || fail "Авторизация работает неправильно"

curl -sSf "${BASE}/api/users/test-user-3/vip" | grep -q 'true' \
  && pass "test-user-3 — VIP-пользователь" \
  || fail "VIP-статус не работает"

curl -sSf "${BASE}/api/users/test-user-2/authorized" | grep -q 'true' \
  && pass "test-user-2 авторизован" \
  || fail "Авторизация (true) не работает"

echo ""
echo "Тесты отелей..."
curl -sSf "${BASE}/api/hotels/test-hotel-1" | grep -q 'Seoul' \
  && pass "test-hotel-1 получен по ID" \
  || fail "test-hotel-1 не найден"

curl -sSf "${BASE}/api/hotels/test-hotel-1/operational" | grep -q 'true' \
  && pass "test-hotel-1 работает" \
  || fail "test-hotel-1 не работает"

curl -sSf "${BASE}/api/hotels/test-hotel-3/operational" | grep -q 'false' \
  && pass "test-hotel-3 не работает" \
  || fail "Статус работы test-hotel-3 некорректен"

curl -sSf "${BASE}/api/hotels/test-hotel-2/fully-booked" | grep -q 'true' \
  && pass "test-hotel-2 полностью забронирован" \
  || fail "Статус fullyBooked test-hotel-2 неверен"

curl -sSf "${BASE}/api/hotels/by-city?city=Seoul" | grep -q 'Seoul' \
  && pass "Поиск отелей в Сеуле работает" \
  || fail "Поиск отелей в Сеуле не работает"

curl -sSf "${BASE}/api/hotels/top-rated?city=Seoul&limit=1" | grep -q 'Seoul' \
  && pass "Топ-отели в Сеуле загружены" \
  || fail "Топ-отели не найдены"

echo ""
echo "Тесты ревью..."
curl -sSf "${BASE}/api/reviews/hotel/test-hotel-1" | grep -q 'Amazing experience' \
  && pass "Отзывы test-hotel-1 найдены" \
  || fail "Отзывы test-hotel-1 не найдены"

curl -sSf "${BASE}/api/reviews/hotel/test-hotel-1/trusted" | grep -q 'true' \
  && pass "test-hotel-1 признан надёжным" \
  || fail "Надёжность test-hotel-1 не определена"

curl -sSf "${BASE}/api/reviews/hotel/test-hotel-3/trusted" | grep -q 'false' \
  && pass "test-hotel-3 НЕ признан надёжным (ожидаемо)" \
  || fail "Надёжность test-hotel-3 некорректно определена"

echo ""
echo "Тесты промокодов..."
curl -sSf "${BASE}/api/promos/TESTCODE1" | grep -q 'TESTCODE1' \
  && pass "Промокод TESTCODE1 найден" \
  || fail "Промокод TESTCODE1 не найден"

curl -sSf "${BASE}/api/promos/TESTCODE-VIP/valid?isVipUser=true" | grep -q 'true' \
  && pass "VIP-промо доступен VIP" \
  || fail "VIP-промо НЕ доступен VIP"

curl -sSf "${BASE}/api/promos/TESTCODE-VIP/valid?isVipUser=false" | grep -q 'false' \
  && pass "VIP-промо недоступен обычному" \
  || fail "VIP-промо доступен обычному"

curl -sSf "${BASE}/api/promos/TESTCODE1/valid" | grep -q 'true' \
  && pass "Обычный промо доступен" \
  || fail "Обычный промо недоступен"

curl -sSf "${BASE}/api/promos/TESTCODE-OLD/valid" | grep -q 'false' \
  && pass "Истекший промо недоступен" \
  || fail "Истекший промо доступен"

curl -sSf -X POST "${BASE}/api/promos/validate?code=TESTCODE1&userId=test-user-2" | grep -q 'TESTCODE1' \
  && pass "POST /validate промо прошёл" \
  || fail "POST /validate не прошёл"

echo ""
echo "Тесты бронирования ПОСЛЕ миграции..."

echo "🧪 Создание бронирования без промо..."
curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1" | grep -q '"hotelId":"test-hotel-1"' \
  && pass "Бронирование прошло (без промо)" \
  || fail "Бронирование (без промо) не прошло"

echo "🧪 Создание бронирования с обычным промо..."
curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1" | grep -q '"promoCode":"TESTCODE1"' \
  && pass "Бронирование с промо прошло" \
  || fail "Бронирование с промо не прошло"

echo "🧪 Создание бронирования с VIP-промо..."
curl -sSf -X POST "${BASE}/api/bookings?userId=test-user-3&hotelId=test-hotel-1&promoCode=TESTCODE-VIP" | grep -q '"promoCode":"TESTCODE-VIP"' \
  && pass "Бронирование с VIP-промо прошло" \
  || fail "Бронирование с VIP-промо не прошло"

echo "🧪 Проверка отказа для неактивного/несуществующего пользователя..."
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-0&hotelId=test-hotel-1")
if [[ "${code}" == "500" ]]; then
  pass "Отклонено: невалидный пользователь"
else
  fail "Ошибка: сервер принял бронирование от невалидного пользователя (код ${code})"
fi

echo "🧪 Проверка отказа для неработающего отеля..."
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-3")
if [[ "${code}" == "500" ]]; then
  pass "Отклонено: неработающий отель"
else
  fail "Ошибка: сервер принял бронирование в неработающем отеле (код ${code})"
fi

echo "🧪 Проверка отказа для полностью занятого отеля..."
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/bookings?userId=test-user-2&hotelId=test-hotel-2")
if [[ "${code}" == "500" ]]; then
  pass "Отклонено: отель полностью забронирован"
else
  fail "Ошибка: сервер принял бронирование в полностью занятом отеле (код ${code})"
fi

echo ""
echo "🧪 Проверка списка бронирований через монолит..."
curl -sSf "${BASE}/api/bookings?userId=test-user-2" | grep -q 'test-user-2' \
  && pass "Все бронирования получены через монолит" \
  || fail "Бронирования не получены через монолит"

curl -sSf "${BASE}/api/bookings?userId=test-user-2" | grep -q 'test-user-2' \
  && pass "Бронирования test-user-2 найдены через монолит" \
  || fail "Нет бронирований test-user-2 через монолит"

echo ""
echo "🧪 Проверка history-таблицы..."
sleep 3

history_count=$(docker exec -i "${HISTORY_DB_CONTAINER}" psql -U "${HISTORY_DB_USER}" -d "${HISTORY_DB_NAME}" -t -A -c "select count(*) from booking_history;")

if [[ "${history_count}" -ge 3 ]]; then
  pass "События дошли до booking-history-service, в history есть записи: ${history_count}"
else
  fail "В booking_history меньше 3 записей: ${history_count}"
fi

docker exec -i "${HISTORY_DB_CONTAINER}" psql -U "${HISTORY_DB_USER}" -d "${HISTORY_DB_NAME}" -c "select * from booking_history order by booking_id;" \
  || fail "Не удалось прочитать booking_history"

echo ""
echo "✅ Все тесты после миграции пройдены!"