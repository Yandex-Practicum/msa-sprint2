package com.hotelio.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.protobuf.Timestamp;
import com.hotelio.history.entity.BookingHistory;
import com.hotelio.history.mapper.BookingHistoryMapper;
import com.hotelio.history.repository.BookingHistoryRepository;
import com.hotelio.proto.booking.events.BookingCreated;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BookingHistoryServiceTest {

    private static final Instant CREATED_AT = Instant.parse("2026-11-03T10:15:30Z");
    private static final Instant NOW = Instant.parse("2026-11-03T10:15:31Z");

    @Mock
    private BookingHistoryRepository bookingHistoryRepository;

    private BookingHistoryService bookingHistoryService;

    @BeforeEach
    void setUp() {
        bookingHistoryService = new BookingHistoryService(
            bookingHistoryRepository,
            Mappers.getMapper(BookingHistoryMapper.class),
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void record_newEvent_savesHistoryWithoutEmptyPromoCode() {
        // given
        var event = event();
        when(bookingHistoryRepository.existsById("42")).thenReturn(false);
        var historyCaptor = ArgumentCaptor.forClass(BookingHistory.class);

        // when
        bookingHistoryService.record(event);

        // then
        verify(bookingHistoryRepository).save(historyCaptor.capture());
        var history = historyCaptor.getValue();
        assertThat(history.getBookingId()).isEqualTo("42");
        assertThat(history.getCreatedAt()).isEqualTo(CREATED_AT);
        assertThat(history.getReceivedAt()).isEqualTo(NOW);
        assertThat(history.getPrice()).isEqualTo(90.0);
        assertThat(history.getHotelCity()).isEqualTo("Seoul");
        assertThat(history.getPromoCode()).isNull();
    }

    @Test
    void record_duplicateEvent_doesNotSaveAgain() {
        // given
        when(bookingHistoryRepository.existsById("42")).thenReturn(true);

        // when
        bookingHistoryService.record(event());

        // then
        verify(bookingHistoryRepository, never()).save(any());
    }

    private static BookingCreated event() {
        var createdAt = Timestamp.newBuilder()
            .setSeconds(CREATED_AT.getEpochSecond())
            .build();

        return BookingCreated.newBuilder()
            .setEventId("event-1")
            .setBookingId("42")
            .setUserId("user-1")
            .setHotelId("hotel-1")
            .setCreatedAt(createdAt)
            .setBasePrice(100.0)
            .setDiscount(10.0)
            .setPrice(90.0)
            .setUserStatus("ACTIVE")
            .setHotelCity("Seoul")
            .build();
    }
}
