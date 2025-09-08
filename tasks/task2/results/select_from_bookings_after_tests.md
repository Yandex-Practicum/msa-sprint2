## Old system (aka Monolith)

```bash
hotelio=# select * from booking;
discount_percent | price |          created_at           | id |   hotel_id   | promo_code |   user_id   
------------------+-------+-------------------------------+----+--------------+------------+-------------
10 |    90 | 2025-10-05 17:32:20.676458+00 | 47 | test-hotel-1 | TESTCODE1  | test-user-2
0 |    80 | 2025-10-05 17:32:20.676458+00 | 48 | test-hotel-1 |            | test-user-3
(2 rows)
```

## New system (booking microservice)
💡 Note: the reason for having 4 records instead of 2 is because 2 records are inserted upfront (see `init-fixtures2.sql`)
to ensure existing tests pass after Monolith switches all requests for booking to a dedicated microservice.

```bash
hotelio_booking_db=# select * from booking;
created_at         |   hotel_id   | id  | promo_code |   user_id   | discount_percent | price
----------------------------+--------------+-----+------------+-------------+------------------+-------
2025-10-05 17:32:20.702476 | test-hotel-1 | 156 | TESTCODE1  | test-user-2 |               10 |    90
2025-10-05 17:32:20.702476 | test-hotel-1 | 157 |            | test-user-3 |                0 |    80
2025-10-05 17:32:21.274836 | test-hotel-1 | 158 |            | test-user-3 |                0 |    80
2025-10-05 17:32:21.517018 | test-hotel-1 | 159 | TESTCODE1  | test-user-2 |               10 |   100
(4 rows)
```