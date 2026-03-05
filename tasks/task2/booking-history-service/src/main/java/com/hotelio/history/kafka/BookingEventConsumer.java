package com.hotelio.history.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelio.history.entity.BookingHistory;
import com.hotelio.history.repository.BookingHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class BookingEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(BookingEventConsumer.class);

    private final BookingHistoryRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BookingEventConsumer(BookingHistoryRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(topics = "booking-events", groupId = "booking-history-group")
    public void consume(String message) {
        log.info("Received Kafka message: {}", message);
        try {
            JsonNode node = objectMapper.readTree(message);

            BookingHistory history = new BookingHistory();
            history.setBookingId(node.path("bookingId").asText());
            history.setUserId(node.path("userId").asText());
            history.setHotelId(node.path("hotelId").asText());
            history.setPromoCode(node.path("promoCode").asText(null));
            history.setPrice(node.path("price").asDouble());
            history.setCreatedAt(node.path("createdAt").asText());
            history.setRecordedAt(Instant.now());

            repository.save(history);
            log.info("Saved booking history for bookingId={}", history.getBookingId());
        } catch (Exception e) {
            log.error("Failed to process Kafka message: {}", e.getMessage(), e);
        }
    }
}
