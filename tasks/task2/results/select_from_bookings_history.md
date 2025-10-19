## Select from bookings history

```bash
hotelio_booking_history_db=# select * from booking_history_record;
         created_at         |      booked_at       | booking_id |   hotel_id   |                  id                  | discount_percent | price | promo_code |   user_id   
----------------------------+----------------------+------------+--------------+--------------------------------------+------------------+-------+------------+-------------
 2025-10-05 17:32:21.357589 | 2025-10-05T17:32:21Z | 158        | test-hotel-1 | ff761225-5199-453f-b3c7-116113d3309b |                0 |    80 |            | test-user-3
 2025-10-05 17:32:21.52971  | 2025-10-05T17:32:21Z | 159        | test-hotel-1 | 000a6973-2ff8-4f21-85bb-8af3b47ff699 |               10 |   100 | TESTCODE1  | test-user-2
(2 rows)
```