package com.hotelio.history.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelio.history.entity.BookingHistory;
import com.hotelio.history.repository.BookingHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;

@Component
public class BookingCreatedListener {

    private static final Logger log = LoggerFactory.getLogger(BookingCreatedListener.class);

    private final BookingHistoryRepository repository;
    private final ObjectMapper objectMapper;

    public BookingCreatedListener(BookingHistoryRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "${booking.events-topic:booking-created}",
            groupId = "${booking.consumer-group:booking-history-service}")
    public void onBookingCreated(String message) {
        log.info("Received BookingCreated event: {}", message);
        try {
            JsonNode node = objectMapper.readTree(message);
            Long bookingId = Long.valueOf(node.path("bookingId").asText());

            Optional<BookingHistory> existing = repository.findByBookingId(bookingId);
            if (existing.isPresent()) {
                log.info("Booking {} already recorded, skipping duplicate", bookingId);
                return;
            }

            BookingHistory history = new BookingHistory();
            history.setEventId(node.path("eventId").asText(null));
            history.setBookingId(bookingId);
            history.setUserId(node.path("userId").asText(null));
            history.setHotelId(node.path("hotelId").asText(null));
            history.setPromoCode(node.path("promoCode").isNull() ? null : node.path("promoCode").asText());
            history.setDiscountPercent(node.has("discountPercent") ? node.path("discountPercent").asDouble() : 0.0);
            history.setPrice(node.has("price") ? node.path("price").asDouble() : 0.0);
            history.setBookingCreatedAt(Instant.parse(node.path("createdAt").asText()));
            history.setEventTime(Instant.parse(node.path("eventTimestamp").asText()));

            repository.save(history);
            log.info("Booking history record saved for booking {}", bookingId);
        } catch (Exception e) {
            log.error("Failed to process BookingCreated event: {}", e.getMessage(), e);
        }
    }
}