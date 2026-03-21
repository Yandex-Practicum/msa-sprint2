package com.hotelio.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelio.booking.entity.BookingHistory;
import com.hotelio.booking.repository.BookingHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingHistoryRepository bookingRepository;
    private final ObjectMapper objectMapper;

    public BookingService(BookingHistoryRepository bookingRepository, ObjectMapper objectMapper) {
        this.bookingRepository = bookingRepository;
        this.objectMapper = objectMapper;
    }


    @KafkaListener(topics = "${kafka.booking-topic.name}", containerFactory = "kafkaListenerContainerFactory")
    public BookingHistory createBookingHistory(String json) throws JsonProcessingException {
        log.info("Creating booking history: {}", json);
        BookingHistory bookingHistory = objectMapper.readValue(json, BookingHistory.class);
        return bookingRepository.save(bookingHistory);
    }
}
