-- app_user
DELETE FROM app_user;
DELETE FROM hotel;
DELETE FROM review;
DELETE FROM promo_code;
DELETE FROM booking;

INSERT INTO app_user (id, status, blacklisted, active, name, email, city)
VALUES
('test-user-1', 'ACTIVE', true, true, 'Alice', 'alice@test.com', 'Seoul'),
('test-user-2', 'ACTIVE', false, true, 'Bob', 'bob@test.com', 'Busan'),
('test-user-3', 'VIP', false, true, 'Clara', 'clara@test.com', 'Daegu'),
('test-user-0', 'ACTIVE', false, false, 'Zoe', 'zoe@test.com', 'Jeju');

-- Отели
INSERT INTO hotel (id, operational, fully_booked, city, rating, description) VALUES
  ('test-hotel-1', true, false, 'Seoul', 4.7, 'Modern hotel in Seoul downtown with spa and skybar.'),
  ('test-hotel-2', true, true, 'Busan', 4.5, 'Luxury beach resort in Busan with ocean view.'),
  ('test-hotel-3', false, false, 'Daegu', 3.8, 'Affordable business hotel in Daegu center.');
  
-- Отзывы (Review)
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

  -- Прочие отели
  ('rev-011', 'test-user-1', 'test-hotel-2', 'Nice but noisy', 3, '2024-02-01'),
  ('rev-012', 'test-user-1', 'test-hotel-3', 'Could be cleaner', 2, '2024-03-10');

-- Промокоды (для тестов PromoCodeController)
INSERT INTO promo_code (code, discount, vip_only, expired, valid_until, description)
VALUES
  ('TESTCODE1', 10.0, false, false, '2099-12-31', 'Обычный промокод'),
  ('TESTCODE-VIP', 20.0, true, false, '2099-12-31', 'Только для VIP'),
  ('TESTCODE-OLD', 5.0, false, true, '2000-01-01', 'Истёкший промокод');
  
  
-- Бронирования (для GET /api/bookings)
INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price, created_at)
VALUES
('test-user-2', 'test-hotel-1', 'TESTCODE1', 10.0, 90.0, NOW()),
('test-user-3', 'test-hotel-1', null, 0.0, 80.0, NOW());

