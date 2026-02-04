package com.hotelio.bookinglog.repository;

import com.hotelio.bookinglog.entity.BookingLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingLogRepository extends JpaRepository<BookingLog, Long> {
}