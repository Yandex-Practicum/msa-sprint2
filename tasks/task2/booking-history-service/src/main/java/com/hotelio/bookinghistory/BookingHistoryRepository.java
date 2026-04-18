package com.hotelio.bookinghistory;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingHistoryRepository extends JpaRepository<BookingHistoryEntity, Long> {
}