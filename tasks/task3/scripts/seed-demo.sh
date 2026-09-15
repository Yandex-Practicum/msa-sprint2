#!/usr/bin/env bash
set -euo pipefail

HOST=localhost
PORT=8084

run_psql() { docker exec -i hotelio-db psql -U hotelio -d hotelio; }

echo "==> Пользователи и отели монолита"
run_psql <<'SQL'
INSERT INTO app_user (id, status, blacklisted, active, name, email, city) VALUES
('user1', 'ACTIVE', false, true, 'Anna Demo', 'anna@hotel.io', 'Seoul'),
('user2', 'VIP', false, true, 'Mark Demo', 'mark@hotel.io', 'Paris'),
('user3', 'ACTIVE', false, true, 'Eve Demo', 'eve@hotel.io', 'Busan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO hotel (id, operational, fully_booked, city, rating, description) VALUES
('grand-central-seoul', true, false, 'Seoul', 4.8, 'Luxury tower in Gwanghwamun with sky lounge.'),
('han-river-retreat',   true, false, 'Seoul', 4.6, 'Riverfront boutique hotel near Banpo bridge.'),
('busan-harbor-view',   true, false, 'Busan', 4.7, 'Scenic harbor-view resort on Gwangan street.'),
('gwangalli-beach',     true, false, 'Busan', 4.5, 'Beachfront hotel with rooftop pool.'),
('daegu-plaza',         true, false, 'Daegu', 4.6, 'Central business hotel with conference floor.'),
('paris-lumiere',       true, false, 'Paris', 4.9, 'Elegant Haussmann hotel near the Seine.')
ON CONFLICT (id) DO NOTHING;
SQL

echo "==> 12 отзывов на каждый отель (avg>=4.0, count>=10 -> trusted)"
run_psql >/dev/null <<'SQL'
DO $$
DECLARE h TEXT; i INT; rid TEXT; pick TEXT[] := ARRAY['Great','Good','Nice','Cool','Fine'];
BEGIN
  FOREACH h IN ARRAY ARRAY['grand-central-seoul','han-river-retreat','busan-harbor-view','gwangalli-beach','daegu-plaza','paris-lumiere'] LOOP
    FOR i IN 1..12 LOOP
      rid := h || '-r' || lpad(i::text, 2, '0');
      INSERT INTO review (id, user_id, hotel_id, text, rating, created_at)
      VALUES (rid, 'user' || (i % 3 + 1), h, pick[1 + (i % 5)], 5 - (i % 4 = 0)::int, '2026-01-01')
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
SQL

echo "==> Брони через REST-фасад монолита (gRPC -> booking-service)"
create_booking() {
  curl -s -o /dev/null -w "  %{http_code}" -X POST "http://${HOST}:${PORT}/api/bookings?userId=$1&hotelId=$2&promoCode=$3"
  echo "  $1 @ $2 promo='$3'"
}
create_booking user1 grand-central-seoul ''
create_booking user1 han-river-retreat ''
create_booking user1 busan-harbor-view TESTCODE1
create_booking user1 gwangalli-beach ''
create_booking user1 daegu-plaza ''
create_booking user1 paris-lumiere TESTCODE1
create_booking user2 grand-central-seoul TESTCODE-VIP
create_booking user2 paris-lumiere ''
echo "==> Готово"