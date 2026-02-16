package com.hotelio.booking.kafka;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class BookingEventProducer {

    private final KafkaTemplate<String, BookingCreatedEvent> kafkaTemplate;
    private final String topic;

    public BookingEventProducer(
            KafkaTemplate<String, BookingCreatedEvent> kafkaTemplate,
            @Value("${booking.kafka.topic}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void sendBookingCreated(BookingCreatedEvent event) {
        kafkaTemplate.send(topic, event.getBookingId().toString(), event);
    }
}