package com.hotelio.booking.service;

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
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Бизнес-правила перенесены из монолита 1:1 (ADR, раздел «Перенос поведения»): базовая цена 100 / 80 для VIP,
 * скидка вычитается как абсолютное значение, порядок проверок тот же.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private static final double BASE_PRICE = 100.0;
    private static final double VIP_BASE_PRICE = 80.0;
    private static final String VIP_STATUS = "VIP";

    private final BookingRepository bookingRepository;
    private final MonolithDataProvider monolithDataProvider;
    private final BookingEventPublisher bookingEventPublisher;
    private final BookingEventMapper bookingEventMapper;
    private final ExecutorService monolithExecutor;
    private final Clock clock;

    public List<Booking> listBookings(String userId) {
        if (userId == null || userId.isBlank()) {
            return bookingRepository.findAllByOrderByIdAsc();
        }

        return bookingRepository.findAllByUserIdOrderByIdAsc(userId);
    }

    public Booking createBooking(String userId, String hotelId, String promoCode) {
        log.info("Creating booking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);

        var userRequest = async(() -> monolithDataProvider.findUser(userId));
        var hotelRequest = async(() -> monolithDataProvider.findHotel(hotelId));
        var trustedRequest = async(() -> monolithDataProvider.isHotelTrusted(hotelId));
        var fullyBookedRequest = async(() -> monolithDataProvider.isHotelFullyBooked(hotelId));
        var promoRequest = async(() -> findApplicablePromoCode(promoCode, userId));

        var user = validateUser(await(userRequest));
        var hotel = validateHotel(
            await(hotelRequest),
            await(trustedRequest),
            await(fullyBookedRequest)
        );

        var basePrice = resolveBasePrice(user);
        var promo = await(promoRequest);
        var discount = promo.map(PromoCodeResponse::getDiscount).orElse(0.0);
        var finalPrice = basePrice - discount;
        log.info("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);

        var booking = Booking.builder()
            .userId(userId)
            .hotelId(hotelId)
            .promoCode(promo.map(PromoCodeResponse::getCode).orElse(null))
            .discountPercent(discount)
            .price(finalPrice)
            .createdAt(clock.instant())
            .build();
        var savedBooking = bookingRepository.save(booking);

        var event = bookingEventMapper.toBookingCreated(
            savedBooking,
            basePrice,
            user.getStatus(),
            hotel.getCity()
        );
        bookingEventPublisher.publishBookingCreated(event);

        return savedBooking;
    }

    private UserResponse validateUser(Optional<UserResponse> user) {
        var existingUser = user.filter(UserResponse::isActive)
            .orElseThrow(() -> new BookingRejectedException(MessageCode.USER_INACTIVE));
        if (existingUser.isBlacklisted()) {
            throw new BookingRejectedException(MessageCode.USER_BLACKLISTED);
        }

        return existingUser;
    }

    private HotelResponse validateHotel(Optional<HotelResponse> hotel, boolean trusted, boolean fullyBooked) {
        var operationalHotel = hotel.filter(HotelResponse::isOperational)
            .orElseThrow(() -> new BookingRejectedException(MessageCode.HOTEL_NOT_OPERATIONAL));
        if (!trusted) {
            throw new BookingRejectedException(MessageCode.HOTEL_NOT_TRUSTED);
        }
        if (fullyBooked) {
            throw new BookingRejectedException(MessageCode.HOTEL_FULLY_BOOKED);
        }

        return operationalHotel;
    }

    private double resolveBasePrice(UserResponse user) {
        return VIP_STATUS.equalsIgnoreCase(user.getStatus()) ? VIP_BASE_PRICE : BASE_PRICE;
    }

    // Неприменённый промокод не сохраняется в бронь: пустой promoCode в ответе — сигнал клиенту (ADR).
    private Optional<PromoCodeResponse> findApplicablePromoCode(String promoCode, String userId) {
        if (promoCode == null || promoCode.isBlank()) {
            return Optional.empty();
        }

        try {
            return monolithDataProvider.validatePromoCode(promoCode, userId);
        } catch (MonolithUnavailableException e) {
            log.warn("Promo code '{}' cannot be verified, booking continues without discount", promoCode, e);

            return Optional.empty();
        }
    }

    private <T> CompletableFuture<T> async(Supplier<T> request) {
        return CompletableFuture.supplyAsync(request, monolithExecutor);
    }

    private static <T> T await(CompletableFuture<T> request) {
        try {
            return request.join();
        } catch (CompletionException e) {
            if (e.getCause() instanceof RuntimeException cause) {
                throw cause;
            }

            throw e;
        }
    }
}
