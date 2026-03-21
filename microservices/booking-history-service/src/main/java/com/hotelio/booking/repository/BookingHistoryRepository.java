package com.hotelio.booking.repository;

import com.hotelio.booking.entity.BookingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingHistoryRepository extends JpaRepository<BookingHistory, Long> {
    List<BookingHistory> findByUserId(String userId);
}
