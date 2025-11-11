CREATE TABLE IF NOT EXISTS bookings
(
    id
    UUID
    PRIMARY
    KEY,
    user_id
    TEXT
    NOT
    NULL,
    hotel_id
    TEXT
    NOT
    NULL,
    promo_code
    TEXT,
    price
    NUMERIC,
    currency
    TEXT,
    final_price
    NUMERIC,
    discount_percent
    NUMERIC,
    check_in
    DATE
    NULL,
    check_out
    DATE
    NULL,
    created_at
    TIMESTAMPTZ
    NOT
    NULL
    DEFAULT
    now
(
),
    idempotency_key TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'CREATED'
    );
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);