package com.hotelio;

import com.hotelio.dto.BookingDTO;
import com.hotelio.service.BookingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
public class BookingCreatedListener {
    private static final Logger log = LoggerFactory.getLogger(BookingCreatedListener.class);

    private final BookingService bookingService;

    public BookingCreatedListener(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @KafkaListener(
            topics = "booking.created",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onBookingCreated(
            @Payload BookingDTO booking,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment ack) {

        log.info("Received BookingCreated: bookingId={}, partition={}, offset={}",
                booking.id(), partition, offset);

        try {
            bookingService.save(booking);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to save booking {} from partition {} offset {}",
                    booking.id(), partition, offset, e);
            throw e;
        }
    }
}
