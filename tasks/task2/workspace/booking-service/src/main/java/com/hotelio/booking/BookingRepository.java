package com.hotelio.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingRepository extends JpaRepository<BookingEntity, Long> {
    List<BookingEntity> findByUserIdOrderByCreatedAtDesc(String userId);
}
