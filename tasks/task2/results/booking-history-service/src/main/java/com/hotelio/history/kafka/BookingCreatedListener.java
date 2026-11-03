package com.hotelio.history.kafka;

import com.google.protobuf.InvalidProtocolBufferException;
import com.hotelio.history.constants.BookingTopics;
import com.hotelio.history.service.BookingHistoryService;
import com.hotelio.proto.booking.events.BookingCreated;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingCreatedListener {

    private final BookingHistoryService bookingHistoryService;

    @KafkaListener(topics = BookingTopics.BOOKING_CREATED)
    public void onBookingCreated(byte[] payload) throws InvalidProtocolBufferException {
        var event = BookingCreated.parseFrom(payload);
        log.info("Received BookingCreated: bookingId={}, eventId={}", event.getBookingId(), event.getEventId());

        bookingHistoryService.record(event);
    }
}
