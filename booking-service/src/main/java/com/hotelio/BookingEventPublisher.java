package com.hotelio;

import com.hotelio.dto.BookingDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class BookingEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(BookingApplication.class);
    private static final String TOPIC = "booking.created";

    private final KafkaTemplate<String, BookingDTO> kafkaTemplate;

    public BookingEventPublisher(KafkaTemplate<String, BookingDTO> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(BookingDTO bookingDto) {
        kafkaTemplate.send(TOPIC, bookingDto.hotelId(), bookingDto)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Не удалось опубликовать BookingCreated {}: {}",
                                bookingDto.hotelId(), ex.getMessage(), ex);
                    } else {
                        log.info("BookingCreated {} отправляем в топик {} partition {} offset {}",
                                bookingDto.hotelId(),
                                result.getRecordMetadata().topic(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });

    }
}
