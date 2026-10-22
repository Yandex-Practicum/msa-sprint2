CREATE TABLE IF NOT EXISTS booking (
  id BIGSERIAL PRIMARY KEY, user_id VARCHAR(255), hotel_id VARCHAR(255), promo_code VARCHAR(255),
  discount_percent DOUBLE PRECISION, price DOUBLE PRECISION NOT NULL, created_at TIMESTAMPTZ);
TRUNCATE booking;

INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price, created_at)
VALUES
('test-user-2', 'test-hotel-1', 'TESTCODE1', 10.0, 90.0, NOW()),
('test-user-3', 'test-hotel-1', null, 0.0, 80.0, NOW());
