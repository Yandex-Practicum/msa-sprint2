# regress.ps1 - Регрессионные тесты для Задания 2
# Запуск: .\regress.ps1

$BASE = "http://localhost:8084"
$passed = 0
$failed = 0

function Pass($msg) {
    Write-Host "[PASS] $msg" -ForegroundColor Green
    $script:passed++
}

function Fail($msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
    $script:failed++
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Регрессионные тесты Hotelio (Задание 2)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Пользователь авторизован
$response = curl.exe -s "$BASE/api/users/test-user-2/authorized"
if ($response -eq "true") { Pass "test-user-2 авторизован" } else { Fail "test-user-2 не авторизован" }

# 2. Пользователь в чёрном списке
$response = curl.exe -s "$BASE/api/users/test-user-1/blacklisted"
if ($response -eq "true") { Pass "test-user-1 в чёрном списке" } else { Fail "test-user-1 не в чёрном списке" }

# 3. Отель работает
$response = curl.exe -s "$BASE/api/hotels/test-hotel-1/operational"
if ($response -eq "true") { Pass "test-hotel-1 работает" } else { Fail "test-hotel-1 не работает" }

# 4. Отель доверенный
$response = curl.exe -s "$BASE/api/reviews/hotel/test-hotel-1/trusted"
if ($response -eq "true") { Pass "test-hotel-1 доверенный" } else { Fail "test-hotel-1 не доверенный" }

# 5. Отель не полностью забронирован
$response = curl.exe -s "$BASE/api/hotels/test-hotel-1/fully-booked"
if ($response -eq "false") { Pass "test-hotel-1 не полностью забронирован" } else { Fail "test-hotel-1 полностью забронирован" }

# 6. Успешное создание бронирования
$response = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-1&promoCode=TESTCODE1"
if ($response -match '"id":') { Pass "Бронирование создано успешно" } else { Fail "Ошибка создания бронирования" }

# 7. Блокировка: отель полностью забронирован
# Проверяем, что бронирование НЕ создано (нет "id": в ответе)
$response = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-2"
if ($response -notmatch '"id":' -and $response -match '"status":5') { 
    Pass "Отель test-hotel-2 полностью забронирован (запрос отклонён)" 
} else { 
    Fail "Не удалось заблокировать бронирование test-hotel-2" 
}

# 8. Блокировка: пользователь в чёрном списке
$response = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-1&hotelId=test-hotel-1"
if ($response -notmatch '"id":' -and $response -match '"status":5') { 
    Pass "Пользователь test-user-1 заблокирован (запрос отклонён)" 
} else { 
    Fail "Не удалось заблокировать test-user-1" 
}

# 9. Блокировка: отель не работает
$response = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-2&hotelId=test-hotel-3"
if ($response -notmatch '"id":' -and $response -match '"status":5') { 
    Pass "Отель test-hotel-3 не работает (запрос отклонён)" 
} else { 
    Fail "Не удалось заблокировать test-hotel-3" 
}

# 10. VIP промокод для VIP-пользователя
$response = curl.exe -s -X POST "$BASE/api/bookings?userId=test-user-3&hotelId=test-hotel-1&promoCode=TESTCODE-VIP"
if ($response -match '"discountPercent":20') { Pass "VIP промокод применён" } else { Fail "VIP промокод не применён" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Результаты: $passed пройдено, $failed провалено" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan