insert into app_user (id, name, email, city, status, blacklisted, active) values
('user-001','Alice','alice@example.com','Paris','ACTIVE', false, true),
('user-005','Bob','bob@example.com','Berlin','ACTIVE', false, true)
on conflict (id) do nothing;