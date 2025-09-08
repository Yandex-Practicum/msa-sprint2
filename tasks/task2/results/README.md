# Data migration strategy after launching BookingService

1. set a sequence id in a new database's `booking` table to `<current_seq_id_in_the_old_db> + <max_bookings_per_day_for_the_last_6_months>`
2. redirect booking requests from the `Monolith` to the `BookingService`;
3. copy the existing booking data using `data-transfer` (without replication) or a similar solution. 