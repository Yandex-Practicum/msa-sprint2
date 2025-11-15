insert into hotel (id, city, description, rating, operational, fully_booked) values
('hotel-777','Rome','Grand Hotel', 4.6, true, false),
('hotel-888','Prague','City Inn', 4.2, true, false)
on conflict (id) do nothing;