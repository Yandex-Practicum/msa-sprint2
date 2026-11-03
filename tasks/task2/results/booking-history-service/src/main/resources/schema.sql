CREATE TABLE IF NOT EXISTS booking_history (
    booking_id  VARCHAR(64) PRIMARY KEY,
    event_id    VARCHAR(64) NOT NULL,
    user_id     VARCHAR(255) NOT NULL,
    hotel_id    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    base_price  DOUBLE PRECISION,
    discount    DOUBLE PRECISION,
    price       DOUBLE PRECISION,
    promo_code  VARCHAR(255),
    user_status VARCHAR(64),
    hotel_city  VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_history_user_id ON booking_history (user_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_hotel_id ON booking_history (hotel_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_created_at ON booking_history (created_at);
