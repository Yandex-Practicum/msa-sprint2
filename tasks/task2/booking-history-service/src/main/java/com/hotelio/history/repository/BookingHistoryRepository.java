package com.hotelio.history.repository;

import com.hotelio.history.entity.BookingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookingHistoryRepository extends JpaRepository<BookingHistory, Long> {

    Optional<BookingHistory> findByBookingId(Long bookingId);

    long countByUserId(String userId);

    long countByHotelId(String hotelId);
}