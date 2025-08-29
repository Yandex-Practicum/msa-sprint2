package com.hotelio.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class KafkaService {
    
    private static final Logger log = LoggerFactory.getLogger(KafkaService.class);
    
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${kafka.topic.booking-created:booking-events}")
    private String bookingTopic;
    
    public KafkaService(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }
    
    public void sendBookingCreatedEvent(String userId, String hotelId, String promoCode, 
                                      Double price, Double discountPercent) {
        try {
            Map<String, Object> event = Map.of(
                "eventType", "BookingCreated",
                "userId", userId,
                "hotelId", hotelId,
                "promoCode", promoCode != null ? promoCode : "",
                "price", price,
                "discountPercent", discountPercent != null ? discountPercent : 0.0,
                "timestamp", Instant.now().toString()
            );
            
            String eventJson = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingTopic, userId, eventJson);
            
            log.info("Sent booking event to Kafka: {}", eventJson);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize booking event", e);
        }
    }
}
