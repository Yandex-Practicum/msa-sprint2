package com.hotelio.bookinghistoryservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelio.bookinghistoryservice.entity.Booking;
import com.hotelio.bookinghistoryservice.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class BookingHistoryListener {

    private static final Logger log = LoggerFactory.getLogger(BookingHistoryListener.class);

    private final ObjectMapper objectMapper;
    private final BookingRepository bookingRepository;

    public BookingHistoryListener(ObjectMapper objectMapper, BookingRepository bookingRepository) {
        this.objectMapper = objectMapper;
        this.bookingRepository = bookingRepository;
    }

    @KafkaListener(
            topics = "booking-events",
            groupId = "booking-history-consumer"
    )
    public void listenBookingEvents(String event) {
        log.info("New booking event: {}", event);
        try {
            Booking booking = objectMapper.readValue(event, Booking.class);
            bookingRepository.save(booking);
        } catch (JsonProcessingException e) {
            log.error(e.getMessage(), e);
            throw new RuntimeException("Error parsing event: " + event, e);
        }
    }
}