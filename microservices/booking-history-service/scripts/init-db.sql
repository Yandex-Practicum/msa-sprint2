CREATE TABLE IF NOT EXISTS booking_history (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  hotel_id VARCHAR(100) NOT NULL,
  promo_code VARCHAR(50),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_history_user_id ON booking_history(user_id);
CREATE INDEX idx_booking_history_booking_id ON booking_history(booking_id);
CREATE INDEX idx_booking_history_created_at ON booking_history(created_at);