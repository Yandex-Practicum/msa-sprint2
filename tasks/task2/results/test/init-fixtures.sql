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
  ('test-hotel-3', false, false, 'Daegu', 3.8, 'Affordable business hotel in Daegu center.'),
  -- Работает, но мало отзывов: отказ именно из-за недоверия, а не из-за закрытия
  ('test-hotel-4', true, false, 'Incheon', 4.0, 'New airport hotel in Incheon.'),
  -- Работает и надёжен, но мест нет: отказ именно из-за fullyBooked
  ('test-hotel-5', true, true, 'Jeju', 4.9, 'Popular island resort in Jeju.');
  
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
  ('rev-012', 'test-user-1', 'test-hotel-3', 'Could be cleaner', 2, '2024-03-10'),
  ('rev-013', 'test-user-2', 'test-hotel-4', 'Good start', 5, '2024-04-01'),
  ('rev-014', 'test-user-3', 'test-hotel-4', 'Fine', 4, '2024-04-02'),

  -- test-hotel-5: 10 отзывов со средней оценкой >= 4.0
  ('rev-021', 'test-user-1', 'test-hotel-5', 'Stunning views', 5, '2024-05-01'),
  ('rev-022', 'test-user-1', 'test-hotel-5', 'Great pool', 5, '2024-05-02'),
  ('rev-023', 'test-user-1', 'test-hotel-5', 'Friendly staff', 4, '2024-05-03'),
  ('rev-024', 'test-user-2', 'test-hotel-5', 'Clean rooms', 4, '2024-05-04'),
  ('rev-025', 'test-user-2', 'test-hotel-5', 'Tasty breakfast', 5, '2024-05-05'),
  ('rev-026', 'test-user-2', 'test-hotel-5', 'Quiet nights', 4, '2024-05-06'),
  ('rev-027', 'test-user-3', 'test-hotel-5', 'Perfect stay', 5, '2024-05-07'),
  ('rev-028', 'test-user-3', 'test-hotel-5', 'Would return', 4, '2024-05-08'),
  ('rev-029', 'test-user-3', 'test-hotel-5', 'Lovely garden', 5, '2024-05-09'),
  ('rev-030', 'test-user-0', 'test-hotel-5', 'Nice spa', 4, '2024-05-10');

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

