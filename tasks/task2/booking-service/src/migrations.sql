create table if not exists bookings (
  id text primary key,
  user_id text not null,
  hotel_id text not null,
  promo_code text,
  discount_percent double precision not null,
  price double precision not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_bookings_user on bookings(user_id);