package com.hotelio.bookinghistory.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelio.bookinghistory.entity.BookingEvent;
import com.hotelio.bookinghistory.repository.BookingEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeParseException;

@Service
public class KafkaConsumerService {
    
    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerService.class);
    
    private final BookingEventRepository repository;
    private final ObjectMapper objectMapper;
    
    @Value("${kafka.topic.booking-created:booking-events}")
    private String topic;
    
    public KafkaConsumerService(BookingEventRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }
    
    @KafkaListener(topics = "${kafka.topic.booking-created:booking-events}", groupId = "booking-history-service")
    public void consumeBookingEvent(String message) {
        try {
            log.info("Received message from Kafka: {}", message);
            
            JsonNode event = objectMapper.readTree(message);
            
            String eventType = event.get("eventType").asText();
            String userId = event.get("userId").asText();
            String hotelId = event.get("hotelId").asText();
            String promoCode = event.has("promoCode") ? event.get("promoCode").asText() : null;
            Double price = event.has("price") ? event.get("price").asDouble() : null;
            Double discountPercent = event.has("discountPercent") ? event.get("discountPercent").asDouble() : null;
            
            Instant timestamp;
            try {
                timestamp = Instant.parse(event.get("timestamp").asText());
            } catch (DateTimeParseException e) {
                timestamp = Instant.now();
            }
            
            BookingEvent bookingEvent = new BookingEvent(
                eventType, userId, hotelId, promoCode, price, discountPercent, timestamp
            );
            
            repository.save(bookingEvent);
            log.info("Saved booking event: {}", bookingEvent.getId());
            
        } catch (Exception e) {
            log.error("Error processing Kafka message: {}", message, e);
        }
    }
}
