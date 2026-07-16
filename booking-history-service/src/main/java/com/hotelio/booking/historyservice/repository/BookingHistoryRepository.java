package com.hotelio.booking.historyservice.repository;

import com.hotelio.booking.historyservice.entity.BookingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingHistoryRepository extends JpaRepository<BookingHistory, Long> {
}
