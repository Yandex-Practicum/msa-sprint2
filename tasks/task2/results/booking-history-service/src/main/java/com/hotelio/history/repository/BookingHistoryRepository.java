package com.hotelio.history.repository;

import com.hotelio.history.entity.BookingHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

// Статистика считается запросом по сырым событиям: новый разрез — это новый GROUP BY, без пересчёта счётчиков.
public interface BookingHistoryRepository extends JpaRepository<BookingHistory, String> {

    List<BookingHistory> findAllByUserIdOrderByCreatedAtAsc(String userId);

    List<BookingHistory> findAllByOrderByCreatedAtAsc();

    @Query(value = """
        SELECT user_id AS dimension, COUNT(*) AS bookings, SUM(price) AS revenue, SUM(discount) AS discounts
        FROM booking_history
        GROUP BY user_id
        ORDER BY bookings DESC, dimension
        """, nativeQuery = true)
    List<BookingStatsView> aggregateByUser();

    @Query(value = """
        SELECT hotel_id AS dimension, COUNT(*) AS bookings, SUM(price) AS revenue, SUM(discount) AS discounts
        FROM booking_history
        GROUP BY hotel_id
        ORDER BY bookings DESC, dimension
        """, nativeQuery = true)
    List<BookingStatsView> aggregateByHotel();

    @Query(value = """
        SELECT CAST(CAST(created_at AT TIME ZONE 'UTC' AS DATE) AS VARCHAR) AS dimension,
               COUNT(*) AS bookings, SUM(price) AS revenue, SUM(discount) AS discounts
        FROM booking_history
        GROUP BY dimension
        ORDER BY dimension
        """, nativeQuery = true)
    List<BookingStatsView> aggregateByDay();

    @Query(value = """
        SELECT hotel_city AS dimension, COUNT(*) AS bookings, SUM(price) AS revenue, SUM(discount) AS discounts
        FROM booking_history
        GROUP BY hotel_city
        ORDER BY bookings DESC, dimension
        """, nativeQuery = true)
    List<BookingStatsView> aggregateByCity();
}
