-- app_user
DELETE FROM public."Bookings";

-- Бронирования (для GET /api/bookings)
INSERT INTO public."Bookings" ("UserId", "HotelId", "PromoCode", "DiscountPercent", "Price", "CreatedAt")
VALUES
('test-user-2', 'test-hotel-1', 'TESTCODE1', 10.0, 90.0, NOW()),
('test-user-3', 'test-hotel-1', null, 0.0, 80.0, NOW());

