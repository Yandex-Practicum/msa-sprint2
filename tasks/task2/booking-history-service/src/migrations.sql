create table if not exists booking_history (
  id bigserial primary key,
  event_id text unique not null,
  event_type text not null,
  occurred_at timestamptz not null,
  booking_id text not null,
  payload jsonb not null
);