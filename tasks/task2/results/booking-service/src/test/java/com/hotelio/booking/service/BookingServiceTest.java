package com.hotelio.booking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hotelio.booking.client.MonolithDataProvider;
import com.hotelio.booking.client.dto.HotelResponse;
import com.hotelio.booking.client.dto.PromoCodeResponse;
import com.hotelio.booking.client.dto.UserResponse;
import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.event.BookingEventPublisher;
import com.hotelio.booking.exception.BookingRejectedException;
import com.hotelio.booking.exception.MessageCode;
import com.hotelio.booking.exception.MonolithUnavailableException;
import com.hotelio.booking.mapper.BookingEventMapper;
import com.hotelio.booking.repository.BookingRepository;
import com.hotelio.proto.booking.events.BookingCreated;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BookingServiceTest {

    private static final String USER_ID = "user-1";
    private static final String HOTEL_ID = "hotel-1";
    private static final String PROMO_CODE = "SUMMER";
    private static final Instant NOW = Instant.parse("2026-11-03T10:00:00Z");

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private MonolithDataProvider monolithDataProvider;

    @Mock
    private BookingEventPublisher bookingEventPublisher;

    private ExecutorService executor;
    private BookingService bookingService;

    @BeforeEach
    void setUp() {
        executor = Executors.newFixedThreadPool(5);
        bookingService = new BookingService(
            bookingRepository,
            monolithDataProvider,
            bookingEventPublisher,
            Mappers.getMapper(BookingEventMapper.class),
            executor,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );

        when(bookingRepository.save(any())).thenAnswer(invocation -> withId(invocation.getArgument(0)));
        givenUser(user("ACTIVE", true, false));
        givenHotel(true, true, false);
    }

    @AfterEach
    void tearDown() {
        executor.shutdownNow();
    }

    @Test
    void createBooking_vipUserWithPromoCode_subtractsAbsoluteDiscountFromVipPrice() {
        // given
        givenUser(user("VIP", true, false));
        when(monolithDataProvider.validatePromoCode(PROMO_CODE, USER_ID)).thenReturn(Optional.of(promo(20.0)));

        // when
        var booking = bookingService.createBooking(USER_ID, HOTEL_ID, PROMO_CODE);

        // then
        assertThat(booking.getPrice()).isEqualTo(60.0);
        assertThat(booking.getDiscountPercent()).isEqualTo(20.0);
        assertThat(booking.getPromoCode()).isEqualTo(PROMO_CODE);
        assertThat(booking.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void createBooking_invalidPromoCode_bookingWithoutPromoCodeAndDiscount() {
        // given
        when(monolithDataProvider.validatePromoCode(PROMO_CODE, USER_ID)).thenReturn(Optional.empty());

        // when
        var booking = bookingService.createBooking(USER_ID, HOTEL_ID, PROMO_CODE);

        // then
        assertThat(booking.getPrice()).isEqualTo(100.0);
        assertThat(booking.getPromoCode()).isNull();
    }

    @Test
    void createBooking_promoCodeCannotBeVerified_bookingWithoutDiscount() {
        // given
        when(monolithDataProvider.validatePromoCode(PROMO_CODE, USER_ID)).thenThrow(new MonolithUnavailableException(new RuntimeException()));

        // when
        var booking = bookingService.createBooking(USER_ID, HOTEL_ID, PROMO_CODE);

        // then
        assertThat(booking.getPrice()).isEqualTo(100.0);
        assertThat(booking.getPromoCode()).isNull();
    }

    @Test
    void createBooking_blacklistedUser_throwsBookingRejected() {
        // given
        givenUser(user("ACTIVE", true, true));

        // when / then
        assertThatThrownBy(() -> bookingService.createBooking(USER_ID, HOTEL_ID, null))
            .isInstanceOf(BookingRejectedException.class)
            .extracting("messageCode")
            .isEqualTo(MessageCode.USER_BLACKLISTED);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_unknownUser_throwsUserInactive() {
        // given
        when(monolithDataProvider.findUser(USER_ID)).thenReturn(Optional.empty());

        // when / then
        assertThatThrownBy(() -> bookingService.createBooking(USER_ID, HOTEL_ID, null))
            .isInstanceOf(BookingRejectedException.class)
            .extracting("messageCode")
            .isEqualTo(MessageCode.USER_INACTIVE);
    }

    @Test
    void createBooking_fullyBookedTrustedHotel_throwsHotelFullyBooked() {
        // given
        givenHotel(true, true, true);

        // when / then
        assertThatThrownBy(() -> bookingService.createBooking(USER_ID, HOTEL_ID, null))
            .isInstanceOf(BookingRejectedException.class)
            .extracting("messageCode")
            .isEqualTo(MessageCode.HOTEL_FULLY_BOOKED);
    }

    @Test
    void createBooking_userCannotBeVerified_throwsMonolithUnavailable() {
        // given
        when(monolithDataProvider.findUser(USER_ID)).thenThrow(new MonolithUnavailableException(new RuntimeException()));

        // when / then
        assertThatThrownBy(() -> bookingService.createBooking(USER_ID, HOTEL_ID, null))
            .isInstanceOf(MonolithUnavailableException.class);
    }

    @Test
    void createBooking_success_publishesBookingCreatedWithSnapshot() {
        // given
        var eventCaptor = ArgumentCaptor.forClass(BookingCreated.class);

        // when
        bookingService.createBooking(USER_ID, HOTEL_ID, null);

        // then
        verify(bookingEventPublisher).publishBookingCreated(eventCaptor.capture());
        var event = eventCaptor.getValue();
        assertThat(event.getBookingId()).isEqualTo("42");
        assertThat(event.getBasePrice()).isEqualTo(100.0);
        assertThat(event.getUserStatus()).isEqualTo("ACTIVE");
        assertThat(event.getHotelCity()).isEqualTo("Seoul");
        assertThat(event.getCreatedAt().getSeconds()).isEqualTo(NOW.getEpochSecond());
        assertThat(event.getPromoCode()).isEmpty();
    }

    private void givenUser(UserResponse user) {
        when(monolithDataProvider.findUser(USER_ID)).thenReturn(Optional.of(user));
    }

    private void givenHotel(boolean operational, boolean trusted, boolean fullyBooked) {
        var hotel = HotelResponse.builder()
            .id(HOTEL_ID)
            .operational(operational)
            .city("Seoul")
            .build();
        when(monolithDataProvider.findHotel(HOTEL_ID)).thenReturn(Optional.of(hotel));
        when(monolithDataProvider.isHotelTrusted(HOTEL_ID)).thenReturn(trusted);
        when(monolithDataProvider.isHotelFullyBooked(HOTEL_ID)).thenReturn(fullyBooked);
    }

    private static UserResponse user(String status, boolean active, boolean blacklisted) {
        return UserResponse.builder()
            .id(USER_ID)
            .status(status)
            .active(active)
            .blacklisted(blacklisted)
            .build();
    }

    private static PromoCodeResponse promo(double discount) {
        return PromoCodeResponse.builder()
            .code(PROMO_CODE)
            .discount(discount)
            .build();
    }

    private static Booking withId(Booking booking) {
        booking.setId(42L);

        return booking;
    }
}
