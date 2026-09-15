package com.hotelio.booking.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelio.booking.entity.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class BookingEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(BookingEventPublisher.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String topic;

    public BookingEventPublisher(KafkaTemplate<String, String> kafkaTemplate,
                                 ObjectMapper objectMapper,
                                 @Value("${booking.events-topic:booking-created}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.topic = topic;
    }

    public void publishBookingCreated(Booking booking) {
        try {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("eventId", UUID.randomUUID().toString());
            event.put("eventType", "BookingCreated");
            event.put("bookingId", String.valueOf(booking.getId()));
            event.put("userId", booking.getUserId());
            event.put("hotelId", booking.getHotelId());
            event.put("promoCode", booking.getPromoCode());
            event.put("discountPercent", booking.getDiscountPercent());
            event.put("price", booking.getPrice());
            event.put("createdAt", booking.getCreatedAt().toString());
            event.put("eventTimestamp", Instant.now().toString());

            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(topic, String.valueOf(booking.getId()), payload);
            log.info("Published BookingCreated event for booking {} to topic {}", booking.getId(), topic);
        } catch (Exception e) {
            log.error("Failed to publish BookingCreated event for booking {}", booking.getId(), e);
        }
    }
}