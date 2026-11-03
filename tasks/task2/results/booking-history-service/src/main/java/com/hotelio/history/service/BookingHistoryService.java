package com.hotelio.history.service;

import com.hotelio.history.dto.BookingHistoryResponse;
import com.hotelio.history.dto.BookingStatsResponse;
import com.hotelio.history.mapper.BookingHistoryMapper;
import com.hotelio.history.repository.BookingHistoryRepository;
import com.hotelio.proto.booking.events.BookingCreated;
import java.time.Clock;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingHistoryService {

    private final BookingHistoryRepository bookingHistoryRepository;
    private final BookingHistoryMapper bookingHistoryMapper;
    private final Clock clock;

    // Kafka доставляет «хотя бы один раз». События одной брони идут в одну партицию (ключ — bookingId)
    // и обрабатываются последовательно, поэтому проверки существования достаточно для идемпотентности.
    @Transactional
    public void record(BookingCreated event) {
        if (bookingHistoryRepository.existsById(event.getBookingId())) {
            log.info("BookingCreated already recorded, skipping duplicate: bookingId={}, eventId={}", event.getBookingId(), event.getEventId());
            return;
        }

        var history = bookingHistoryMapper.toEntity(event, clock.instant());
        bookingHistoryRepository.save(history);

        log.info("Booking history recorded: bookingId={}, userId={}, hotelId={}", event.getBookingId(), event.getUserId(), event.getHotelId());
    }

    @Transactional(readOnly = true)
    public List<BookingHistoryResponse> findHistory(String userId) {
        var histories = userId == null || userId.isBlank()
            ? bookingHistoryRepository.findAllByOrderByCreatedAtAsc()
            : bookingHistoryRepository.findAllByUserIdOrderByCreatedAtAsc(userId);

        return bookingHistoryMapper.toResponses(histories);
    }

    @Transactional(readOnly = true)
    public List<BookingStatsResponse> statsByUser() {
        return bookingHistoryMapper.toStatsResponses(bookingHistoryRepository.aggregateByUser());
    }

    @Transactional(readOnly = true)
    public List<BookingStatsResponse> statsByHotel() {
        return bookingHistoryMapper.toStatsResponses(bookingHistoryRepository.aggregateByHotel());
    }

    @Transactional(readOnly = true)
    public List<BookingStatsResponse> statsByDay() {
        return bookingHistoryMapper.toStatsResponses(bookingHistoryRepository.aggregateByDay());
    }

    @Transactional(readOnly = true)
    public List<BookingStatsResponse> statsByCity() {
        return bookingHistoryMapper.toStatsResponses(bookingHistoryRepository.aggregateByCity());
    }
}
