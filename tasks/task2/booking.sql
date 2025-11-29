
DELETE FROM booking;

-- Бронирования (для GET /api/bookings)
INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price, created_at)
VALUES
('user-2', 'hotel-1', 'TESTCODE1', 10.0, 90.0, NOW()),
('user-3', 'hotel-1', null, 0.0, 80.0, NOW());

