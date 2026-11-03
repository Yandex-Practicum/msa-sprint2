CREATE TABLE IF NOT EXISTS booking (
    id               BIGSERIAL PRIMARY KEY,
    user_id          VARCHAR(255) NOT NULL,
    hotel_id         VARCHAR(255) NOT NULL,
    promo_code       VARCHAR(255),
    discount_percent DOUBLE PRECISION,
    price            DOUBLE PRECISION,
    created_at       TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking (user_id);
