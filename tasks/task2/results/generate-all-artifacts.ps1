# generate-all-artifacts.ps1
# Запуск из папки task2/results/:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\generate-all-artifacts.ps1

$ErrorActionPreference = "Continue"
$BASE = "http://localhost:8084"

# ========================================
# Helper-функции для работы с UTF-8
# ========================================
function Write-FileUtf8($path, $content) {
    [System.IO.File]::WriteAllText(
        (Join-Path (Get-Location) $path),
        $content,
        [System.Text.UTF8Encoding]::new($false)  # без BOM
    )
}

function Append-FileUtf8($path, $content) {
    [System.IO.File]::AppendAllText(
        (Join-Path (Get-Location) $path),
        $content,
        [System.Text.UTF8Encoding]::new($false)
    )
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Создание артефактов для Задания 2" -ForegroundColor Cyan
Write-Host "Текущая папка: $(Get-Location)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# 1. docker ps
# ========================================
Write-Host "1/8: docker ps..." -ForegroundColor Yellow
$dockerPs = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
Write-FileUtf8 "docker-ps.log" ($dockerPs -join "`n")
Write-Host "   ✅ docker-ps.log создан" -ForegroundColor Green

# ========================================
# 2. init-fixtures.sql
# ========================================
Write-Host "2/8: init-fixtures.sql..." -ForegroundColor Yellow
if (-not (Test-Path init-fixtures.sql)) {
    $sqlContent = @"
-- Очистка
DELETE FROM booking;
DELETE FROM review;
DELETE FROM promo_code;
DELETE FROM hotel;
DELETE FROM app_user;

-- Пользователи
INSERT INTO app_user (id, status, blacklisted, active, name, email, city) VALUES
('test-user-1', 'ACTIVE', true, true, 'Alice', 'alice@test.com', 'Seoul'),
('test-user-2', 'ACTIVE', false, true, 'Bob', 'bob@test.com', 'Busan'),
('test-user-3', 'VIP', false, true, 'Clara', 'clara@test.com', 'Daegu'),
('test-user-0', 'ACTIVE', false, false, 'Zoe', 'zoe@test.com', 'Jeju');

-- Отели
INSERT INTO hotel (id, operational, fully_booked, city, rating, description) VALUES
('test-hotel-1', true, false, 'Seoul', 4.7, 'Modern hotel in Seoul downtown'),
('test-hotel-2', true, true, 'Busan', 4.5, 'Luxury beach resort in Busan'),
('test-hotel-3', false, false, 'Daegu', 3.8, 'Affordable business hotel');

-- Отзывы (10 для test-hotel-1, чтобы он стал trusted)
INSERT INTO review (id, user_id, hotel_id, text, rating, created_at) VALUES
('rev-001', 'test-user-1', 'test-hotel-1', 'Amazing experience!', 5, '2024-01-01'),
('rev-002', 'test-user-1', 'test-hotel-1', 'Loved it!', 4, '2024-01-03'),
('rev-003', 'test-user-1', 'test-hotel-1', 'Very good stay', 5, '2024-01-07'),
('rev-004', 'test-user-2', 'test-hotel-1', 'Comfortable and clean', 4, '2024-01-10'),
('rev-005', 'test-user-2', 'test-hotel-1', 'Great service', 4, '2024-01-12'),
('rev-006', 'test-user-2', 'test-hotel-1', 'Modern rooms', 4, '2024-01-14'),
('rev-007', 'test-user-2', 'test-hotel-1', 'Nice ambiance', 4, '2024-01-16'),
('rev-008', 'test-user-3', 'test-hotel-1', 'Cozy and quiet', 4, '2024-01-18'),
('rev-009', 'test-user-3', 'test-hotel-1', 'Perfect location', 4, '2024-01-20'),
('rev-010', 'test-user-3', 'test-hotel-1', 'Will come again', 4, '2024-01-22'),
('rev-011', 'test-user-1', 'test-hotel-2', 'Nice but noisy', 3, '2024-02-01'),
('rev-012', 'test-user-1', 'test-hotel-3', 'Could be cleaner', 2, '2024-03-10');

-- Промокоды
INSERT INTO promo_code (code, discount, vip_only, expired, valid_until, description) VALUES
('TESTCODE1', 10.0, false, false, '2099-12-31', 'Обычный промокод'),
('TESTCODE-VIP', 20.0, true, false, '2099-12-31', 'Только для VIP'),
('TESTCODE-OLD', 5.0, false, true, '2000-01-01', 'Истёкший промокод');

-- Бронирования
INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price, created_at) VALUES
('test-user-2', 'test-hotel-1', 'TESTCODE1', 10.0, 90.0, NOW()),
('test-user-3', 'test-hotel-1', null, 0.0, 80.0, NOW());
"@
    Write-FileUtf8 "init-fixtures.sql" $sqlContent
    Write-Host "   ✅ init-fixtures.sql создан" -ForegroundColor Green
} else {
    Write-Host "   ✅ init-fixtures.sql уже существует" -ForegroundColor Green
}

# ========================================
# 3. regress-output.log
# ========================================
Write-Host "3/8: regress.ps1..." -ForegroundColor Yellow
if (Test-Path regress.ps1) {
    $regressOutput = powershell.exe -NoProfile -ExecutionPolicy Bypass -File regress.ps1 2>&1
    Write-FileUtf8 "regress-output.log" ($regressOutput -join "`n")
    Write-Host "   ✅ regress-output.log создан" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ regress.ps1 не найден, пропуск" -ForegroundColor Yellow
}

# ========================================
# 4. test-log.txt
# ========================================
Write-Host "4/8: test-log.txt..." -ForegroundColor Yellow

# Очистить файл
Write-FileUtf8 "test-log.txt" ""

function Add-Log($text) {
    Append-FileUtf8 "test-log.txt" "$text`n"
}

Add-Log "=================================================="
Add-Log "TEST LOG: Задание 2 - Миграция на микросервисы"
Add-Log "Дата: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Log "=================================================="
Add-Log ""

# 4.1. Успешные сценарии
Add-Log "--- 1. УСПЕШНЫЕ СЦЕНАРИИ ---"
Add-Log ""

Add-Log "1.1. Бронирование с промокодом (скидка 10%):"
Add-Log "  POST $BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1"
$r = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1"
Add-Log "  Ответ: $r"
Add-Log ""

Add-Log "1.2. Бронирование без промокода:"
Add-Log "  POST $BASE/api/bookings?userId=test-user-3&hotelId=test-hotel-1"
$r = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-3&hotelId=test-hotel-1"
Add-Log "  Ответ: $r"
Add-Log ""

Add-Log "1.3. VIP промокод для VIP-пользователя (скидка 20%):"
Add-Log "  POST $BASE/api/bookings?userId=test-user-3&hotelId=test-hotel-1&promoCode=TESTCODE-VIP"
$r = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-3&hotelId=test-hotel-1&promoCode=TESTCODE-VIP"
Add-Log "  Ответ: $r"
Add-Log ""

# 4.2. Негативные сценарии
Add-Log "--- 2. НЕГАТИВНЫЕ СЦЕНАРИИ (ожидаемые ошибки) ---"
Add-Log ""

Add-Log "2.1. Полностью забронированный отель (test-hotel-2):"
Add-Log "  POST $BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-2"
$r = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-2"
Add-Log "  Ответ: $r"
Add-Log "  Ожидание: ошибка (отель полностью забронирован)"
Add-Log ""

Add-Log "2.2. Пользователь из чёрного списка (test-user-1):"
Add-Log "  POST $BASE/api/bookings?userId=test-user-1&hotelId=test-hotel-1"
$r = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-1&hotelId=test-hotel-1"
Add-Log "  Ответ: $r"
Add-Log "  Ожидание: ошибка (пользователь не авторизован)"
Add-Log ""

Add-Log "2.3. Неработающий отель (test-hotel-3):"
Add-Log "  POST $BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-3"
$r = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-3"
Add-Log "  Ответ: $r"
Add-Log "  Ожидание: ошибка (отель не работает)"
Add-Log ""

Write-Host "   ✅ test-log.txt создан" -ForegroundColor Green

# ========================================
# 5. bookings-new-db.txt и bookings-old-db.txt
# ========================================
Write-Host "5/8: SELECT * FROM bookings..." -ForegroundColor Yellow

# Новая БД - передаём SQL через stdin (самый надёжный способ)
$newDbContent = "=== Новая БД (booking-service) ===`n"
try {
    # Передаём SQL через stdin, используем -i для интерактивного режима
    $newDbResult = 'SELECT * FROM "Bookings";' | docker exec -i booking-service-db psql -U booking -d booking_db 2>&1
    $newDbContent += ($newDbResult -join "`n") + "`n"
} catch {
    $newDbContent += "ОШИБКА: $_`n"
}
Write-FileUtf8 "bookings-new-db.txt" $newDbContent
Write-Host "   ✅ bookings-new-db.txt создан" -ForegroundColor Green

# Старая БД
$oldDbContent = "=== Старая БД (монолит) ===`n"
try {
    $oldDbResult = "SELECT * FROM booking;" | docker exec -i hotelio-db psql -U hotelio -d hotelio 2>&1
    $oldDbContent += ($oldDbResult -join "`n") + "`n"
} catch {
    $oldDbContent += "ОШИБКА: $_`n"
}
Write-FileUtf8 "bookings-old-db.txt" $oldDbContent
Write-Host "   ✅ bookings-old-db.txt создан" -ForegroundColor Green

# ========================================
# 6. listing-comparison.txt
# ========================================
Write-Host "6/8: Листинг REST и gRPC..." -ForegroundColor Yellow

$content = "=== Листинг бронирований ===`n`n"

# REST - с форматированием JSON
$content += "--- Через REST (монолит) ---`n"
$content += "GET http://localhost:8084/api/bookings?userId=test-user-2`n"
$restResult = curl.exe -s "http://localhost:8084/api/bookings?userId=test-user-2"

# Форматируем JSON для красивого вывода
try {
    $parsed = $restResult | ConvertFrom-Json
    $formatted = $parsed | ConvertTo-Json -Depth 10
    $content += "$formatted`n`n"
} catch {
    $content += "$restResult`n`n"
}

# gRPC - grpcurl уже возвращает отформатированный JSON
$content += "--- Через gRPC (booking-service) ---`n"
$content += 'grpcurl -plaintext -d ''{"user_id": "test-user-2"}'' booking-service:9090 booking.BookingService/ListBookings' + "`n"

$jsonContent = '{"user_id": "test-user-2"}'
try {
    # Передаём JSON через stdin
    $grpcResult = $jsonContent | docker run -i --rm --network hotelio-net fullstorydev/grpcurl -plaintext -d '@' booking-service:9090 booking.BookingService/ListBookings 2>&1
    $content += ($grpcResult -join "`n") + "`n"
} catch {
    $content += "ОШИБКА: $_`n"
}

Write-FileUtf8 "listing-comparison.txt" $content
Write-Host "   ✅ listing-comparison.txt создан" -ForegroundColor Green

# ========================================
# 7. booking-history.txt
# ========================================
Write-Host "7/8: История бронирований..." -ForegroundColor Yellow

$historyContent = "=== История бронирований (booking-history-db) ===`n"
try {
    $historyResult = 'SELECT * FROM "BookingHistories";' | docker exec -i booking-history-db psql -U history -d booking_history_db 2>&1
    $historyContent += ($historyResult -join "`n") + "`n"
} catch {
    $historyContent += "ОШИБКА: $_`n"
}
Write-FileUtf8 "booking-history.txt" $historyContent
Write-Host "   ✅ booking-history.txt создан" -ForegroundColor Green

# ========================================
# 8. README.md (создаём, если нет)
# ========================================
Write-Host "8/8: README.md..." -ForegroundColor Yellow
if (-not (Test-Path README.md)) {
    $readmeContent = @"
# Задание 2: Миграция на микросервисную архитектуру

## Обзор

Реализована миграция модуля бронирования из монолита в отдельный микросервис с использованием паттерна **Strangler Fig**.

## Архитектура решения
Клиент → Монолит (Spring Boot) → booking-service (.NET 8, gRPC)
↑ ↓
└──── REST (валидация) ───┘
↓
PostgreSQL
↓
Kafka
↓
booking-history-service
↓
БД аналитики (PostgreSQL)

## Компоненты

1. **Монолит** (Spring Boot) — принимает REST-запросы, проксирует в booking-service через gRPC
2. **booking-service** (.NET 8) — gRPC-сервер, управляет бронированиями
3. **booking-history-service** (.NET 8) — Kafka consumer для аналитики
4. **Kafka** — брокер сообщений для асинхронной коммуникации
5. **PostgreSQL** — БД для каждого сервиса

## Стратегия миграции данных

### При запуске нового сервиса (As-Is → To-Be)

1. **Фаза 1: Параллельная работа**
   - Монолит продолжает работать
   - Новые бронирования создаются через booking-service
   - Исторические данные остаются в монолите

2. **Фаза 2: Перенос исторических данных**
   - Разовый скрипт миграции переносит данные из booking (монолит) в Bookings (новый сервис)
   - Батчевая обработка для больших объёмов
   - Проверка целостности данных

3. **Фаза 3: Переключение трафика**
   - Все новые запросы идут через booking-service
   - Монолит остаётся как прокси

### Стратегия To-Be

1. **Выделение доменных сервисов:**
   - UserService — управление пользователями
   - HotelService — управление отелями
   - PromoCodeService — управление промокодами
   - ReviewService — управление отзывами

2. **Устранение зависимости от монолита:**
   - booking-service перестаёт вызывать монолит для валидации
   - Каждый сервис имеет свою БД

3. **API Gateway:**
   - Единая точка входа для клиентов
   - Маршрутизация, аутентификация, rate limiting

4. **Событийная архитектура:**
   - Все изменения данных публикуются в Kafka
   - Сервисы реагируют на события асинхронно

## Технологии

| Компонент | Технология |
|---|---|
| Монолит | Java, Spring Boot |
| booking-service | .NET 8, gRPC |
| booking-history-service | .NET 8, Kafka Consumer |
| БД | PostgreSQL |
| Брокер сообщений | Apache Kafka |
| Протокол взаимодействия | gRPC (HTTP/2 + Protobuf) |
| Оркестрация | Docker Compose |

## Запуск

```bash
docker compose up -d --build

# Загрузка фикстур
docker cp init-fixtures.sql hotelio-db:/tmp/init-fixtures.sql
docker exec -it hotelio-db psql -U hotelio -d hotelio -f /tmp/init-fixtures.sql

# Тестирование
curl -X POST "http://localhost:8084/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1"
Артефакты
Файл
Описание
docker-ps.log
Вывод docker ps с запущенными контейнерами
init-fixtures.sql
Скрипт загрузки тестовых данных
regress-output.log
Результаты регрессионных тестов
test-log.txt
Логи тестовых запросов
bookings-new-db.txt
Данные из новой БД (booking-service)
bookings-old-db.txt
Данные из старой БД (монолит)
booking-history.txt
Данные из БД аналитики
listing-comparison.txt
Сравнение REST и gRPC листинга
Преимущества миграции
Независимое развёртывание — booking-service можно обновлять без перезапуска монолита
Масштабируемость — можно масштабировать только нагруженные сервисы
Отказоустойчивость — падение одного сервиса не влияет на другие
Технологическая гибкость — можно использовать разные языки и фреймворки
Постепенная миграция — не нужно переписывать всё сразу
"@
Write-FileUtf8 "README.md" $readmeContent
Write-Host " ✅ README.md создан" -ForegroundColor Green
} else {
Write-Host " ✅ README.md уже существует" -ForegroundColor Green
}
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Все артефакты созданы!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""