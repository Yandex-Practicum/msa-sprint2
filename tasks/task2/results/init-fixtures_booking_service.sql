-- app_user
DELETE FROM booking;

-- Бронирования (для GET /api/bookings)
INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price, created_at)
VALUES
('test-user-2', 'test-hotel-1', 'TESTCODE1', 10.0, 90.0, NOW()),
('test-user-3', 'test-hotel-1', null, 0.0, 80.0, NOW());

