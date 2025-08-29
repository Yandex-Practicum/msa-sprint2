package com.hotelio.bookinghistory.repository;

import com.hotelio.bookinghistory.entity.BookingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface BookingEventRepository extends JpaRepository<BookingEvent, Long> {
    
    List<BookingEvent> findByUserId(String userId);
    
    List<BookingEvent> findByHotelId(String hotelId);
    
    List<BookingEvent> findByTimestampBetween(Instant start, Instant end);
    
    @Query("SELECT COUNT(b) FROM BookingEvent b WHERE b.hotelId = ?1")
    long countByHotelId(String hotelId);
    
    @Query("SELECT AVG(b.price) FROM BookingEvent b WHERE b.hotelId = ?1")
    Double getAveragePriceByHotelId(String hotelId);
    
    @Query("SELECT COUNT(b) FROM BookingEvent b WHERE b.userId = ?1")
    long countByUserId(String userId);
}
