package com.hotelio.bookinghistory;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class BookingHistoryListener {

    private final BookingHistoryRepository repository;

    public BookingHistoryListener(BookingHistoryRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(topics = "booking.created", groupId = "booking-history-group")
    public void handleBookingCreated(BookingCreatedEvent event) {
        BookingHistoryEntity entity = new BookingHistoryEntity();
        entity.setBookingId(Long.valueOf(event.getBookingId()));
        entity.setUserId(event.getUserId());
        entity.setHotelId(event.getHotelId());
        entity.setPromoCode(event.getPromoCode());
        entity.setDiscountPercent(event.getDiscountPercent());
        entity.setPrice(event.getPrice());
        entity.setCreatedAt(event.getCreatedAt());

        repository.save(entity);
    }
}