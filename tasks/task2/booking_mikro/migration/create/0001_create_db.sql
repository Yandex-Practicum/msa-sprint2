-- +goose no transaction
-- +goose up
CREATE DATABASE booking_srv OWNER=hotelio;

-- +goose Down
DROP DATABASE booking_srv;