README.md с объяснением стратегии миграции данных при запуске нового сервиса и стратегии To Be

Новый booking-service использует БД монолита поэтому  
booking-history-service использует свою БД. 
 - Для этого поднимается контейнер postgresql - booking-history-db
 - Используется БД booking-history-db
 - в ней создается таблица bookingHistory 
