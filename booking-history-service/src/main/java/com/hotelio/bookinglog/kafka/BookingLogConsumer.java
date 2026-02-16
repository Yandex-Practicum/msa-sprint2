package com.hotelio.bookinglog.kafka;

import com.hotelio.bookinglog.entity.BookingLog;
import com.hotelio.booking.kafka.BookingCreatedEvent;
import com.hotelio.bookinglog.repository.BookingLogRepository;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class BookingLogConsumer {

    private final BookingLogRepository repository;

    public BookingLogConsumer(BookingLogRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(
        topics = "${booking.kafka.topic}",
        groupId = "${spring.kafka.consumer.group-id}"
    )

    @Transactional
    public void consume(BookingCreatedEvent event) {

        BookingLog log = new BookingLog();
        log.setBookingId(event.getBookingId());
        log.setUserId(event.getUserId());
        log.setHotelId(event.getHotelId());
        log.setDiscountPercent(event.getDiscountPercent());
        log.setPrice(event.getPrice());
        log.setCreatedAt(Instant.parse(event.getCreatedAt()));

        repository.save(log);
    }
}