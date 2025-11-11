CREATE TABLE IF NOT EXISTS booking_events
(
    offset
    BIGINT
    PRIMARY
    KEY,
    event_id
    UUID
    UNIQUE
    NOT
    NULL,
    booking_id
    UUID
    NOT
    NULL,
    occurred_at
    TIMESTAMPTZ
    NOT
    NULL,
    payload
    JSONB
    NOT
    NULL
);


CREATE TABLE IF NOT EXISTS daily_bookings
(
    date
    DATE
    PRIMARY
    KEY,
    total_count
    BIGINT
    NOT
    NULL
    DEFAULT
    0,
    total_amount
    NUMERIC
    NOT
    NULL
    DEFAULT
    0
);


CREATE TABLE IF NOT EXISTS user_bookings
(
    user_id
    TEXT
    PRIMARY
    KEY,
    total_count
    BIGINT
    NOT
    NULL
    DEFAULT
    0,
    total_amount
    NUMERIC
    NOT
    NULL
    DEFAULT
    0
);


CREATE TABLE IF NOT EXISTS hotel_bookings
(
    hotel_id
    TEXT
    PRIMARY
    KEY,
    total_count
    BIGINT
    NOT
    NULL
    DEFAULT
    0,
    total_amount
    NUMERIC
    NOT
    NULL
    DEFAULT
    0
);