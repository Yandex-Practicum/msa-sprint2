CREATE TABLE IF NOT EXISTS booking_history (
    booking_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    hotel_id VARCHAR(255) NOT NULL,
    promo_code VARCHAR(255),
    discount_percent DOUBLE PRECISION NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    created_at VARCHAR(255) NOT NULL
);