package com.hotelio.repo;

import com.hotelio.entity.BookingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<BookingEntity, Long> {
    Optional<BookingEntity> findBookingById(Long bookingId);
    List<BookingEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    List<BookingEntity> findByHotelId(String hotelId);
}
