CREATE TABLE IF NOT EXISTS booking (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    hotel_id TEXT NOT NULL,
    promo_code TEXT,
    discount_percent FLOAT,
    price FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);