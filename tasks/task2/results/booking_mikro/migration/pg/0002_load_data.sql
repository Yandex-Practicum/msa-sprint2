-- +goose Up
INSERT INTO booking_srv.booking 
SELECT * FROM hotelio.booking;
-- +goose Down

