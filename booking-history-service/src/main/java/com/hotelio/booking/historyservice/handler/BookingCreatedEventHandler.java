package com.hotelio.booking.historyservice.handler;

import com.hotelio.booking.historyservice.entity.BookingHistory;
import com.hotelio.booking.historyservice.repository.BookingHistoryRepository;
import com.hotelio.core.middleware.BookingCreatedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@KafkaListener(topics = "booking-history-topic")
public class BookingCreatedEventHandler {

    private final BookingHistoryRepository bookingHistoryRepository;

    @Autowired
    public BookingCreatedEventHandler(BookingHistoryRepository bookingHistoryRepository) {
        this.bookingHistoryRepository = bookingHistoryRepository;
    }

    @KafkaHandler
    public void handle(BookingCreatedEvent bookingCreatedEvent) {
        log.info("Received a new event with bookingId = {}, ", bookingCreatedEvent.getBookingId());

        BookingHistory bookingHistory = new BookingHistory();
        bookingHistory.setBookingId(bookingCreatedEvent.getBookingId());
        bookingHistory.setPrice(bookingCreatedEvent.getPrice());
        bookingHistory.setHotelId(bookingCreatedEvent.getHotelId());
        bookingHistory.setUserId(bookingCreatedEvent.getUserId());
        bookingHistory.setDiscountPercent(bookingCreatedEvent.getDiscountPercent());
        bookingHistory.setPromoCode(bookingCreatedEvent.getPromoCode());
        bookingHistory.setCreatedAt(bookingCreatedEvent.getCreatedAt());
        bookingHistoryRepository.save(bookingHistory);
    }
}
