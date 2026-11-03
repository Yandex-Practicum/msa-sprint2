package com.hotelio.booking.event;

import com.hotelio.booking.constants.BookingTopics;
import com.hotelio.proto.booking.events.BookingCreated;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingEventPublisher {

    private final KafkaTemplate<String, byte[]> kafkaTemplate;

    // Бронь уже сохранена, поэтому ошибка отправки не отменяет её: событие теряется, это видно в логе.
    // Если потеря событий станет недопустимой — transactional outbox (см. ADR).
    public void publishBookingCreated(BookingCreated event) {
        try {
            kafkaTemplate.send(BookingTopics.BOOKING_CREATED, event.getBookingId(), event.toByteArray())
                .whenComplete((result, error) -> logResult(event, error));
        } catch (RuntimeException e) {
            logResult(event, e);
        }
    }

    private void logResult(BookingCreated event, Throwable error) {
        if (error != null) {
            log.error("Failed to publish BookingCreated: bookingId={}, eventId={}", event.getBookingId(), event.getEventId(), error);
            return;
        }

        log.info("Published BookingCreated: bookingId={}, eventId={}", event.getBookingId(), event.getEventId());
    }
}
