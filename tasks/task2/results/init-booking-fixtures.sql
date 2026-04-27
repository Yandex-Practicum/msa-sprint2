CREATE TABLE IF NOT EXISTS bookings (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  hotel_id text NOT NULL,
  promo_code text,
  discount_percent double precision NOT NULL DEFAULT 0,
  price double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

TRUNCATE TABLE bookings RESTART IDENTITY;

INSERT INTO bookings (user_id, hotel_id, promo_code, discount_percent, price, created_at)
VALUES
('test-user-2', 'test-hotel-1', 'TESTCODE1', 10.0, 90.0, NOW()),
('test-user-3', 'test-hotel-1', null, 0.0, 80.0, NOW());
