-- +goose Up
CREATE TABLE booking (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    hotel_id TEXT,
    promo_code TEXT,
    discount_percent DOUBLE PRECISION,
	price           DOUBLE PRECISION,
	created_at       TIMESTAMPTZ
);

-- +goose Down
DROP TABLE booking;
