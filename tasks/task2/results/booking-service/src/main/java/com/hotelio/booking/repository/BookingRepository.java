package com.hotelio.booking.repository;

import com.hotelio.booking.entity.Booking;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findAllByOrderByIdAsc();

    List<Booking> findAllByUserIdOrderByIdAsc(String userId);
}
