package com.hotelio.bookingservice.kafka;

import com.hotelio.bookingservice.entity.BookingEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class BookingKafkaProducer {

    private static final Logger log = LoggerFactory.getLogger(BookingKafkaProducer.class);

    private final KafkaTemplate<String, BookingEvent> kafkaTemplate;
    private final String topic;

    public BookingKafkaProducer(
            KafkaTemplate<String, BookingEvent> kafkaTemplate,
            @Value("${KAFKA_BOOKING_EVENTS_TOPIC:booking.created}") String topic
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void publishBookingCreated(BookingEvent event) {
        String key = String.valueOf(event.id());
        log.info("Publishing booking event to topic '{}': key={}, bookingId={}",
                topic, key, event.id());

        CompletableFuture<SendResult<String, BookingEvent>> future = kafkaTemplate.send(topic, key, event);

        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.info("Booking event published successfully: topic='{}', offset={}, partition={}",
                        topic, result.getRecordMetadata().offset(), result.getRecordMetadata().partition());
            } else {
                log.error("Failed to publish booking event to topic '{}': bookingId={}",
                        topic, event.id(), ex);
            }
        });
    }
}