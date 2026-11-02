package com.hotelio.service;

import com.hotelio.dto.BookingDTO;
import com.hotelio.entity.BookingEntity;
import com.hotelio.repo.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository repository;

    public BookingService(BookingRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void save(BookingDTO dto) {
        // Идемпотентность: если уже есть — пропускаем (дубль из Kafka)
        if (repository.findBookingById(dto.id()).isPresent()) {
            log.info("BookingHistory already exists for {}, skipping", dto.id());
            return;
        }

        BookingEntity entity = new BookingEntity();
        entity.setId(dto.id());
        entity.setUserId(dto.userId());
        entity.setHotelId(dto.hotelId());
        entity.setPromoCode(dto.promoCode());
        entity.setDiscountPercent(dto.discountPercent());
        entity.setPrice(dto.price());
        entity.setCreatedAt(dto.createdAt() != null ? dto.createdAt() : Instant.now());

        repository.save(entity);
        log.info("Saved BookingHistory for bookingId={}", dto.id());
    }
}
