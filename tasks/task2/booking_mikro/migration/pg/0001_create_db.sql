-- +goose Up
CREATE DATABASE booking_srv OWNER=hotelio;

-- +goose Down
DROP DATABASE booking_srv;