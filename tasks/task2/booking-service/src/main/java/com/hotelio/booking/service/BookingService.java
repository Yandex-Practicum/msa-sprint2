package com.hotelio.booking.service;

import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.kafka.BookingEventPublisher;
import com.hotelio.booking.repository.BookingRepository;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final MonolithClient monolithClient;
    private final BookingEventPublisher eventPublisher;

    public BookingService(BookingRepository bookingRepository,
                          MonolithClient monolithClient,
                          BookingEventPublisher eventPublisher) {
        this.bookingRepository = bookingRepository;
        this.monolithClient = monolithClient;
        this.eventPublisher = eventPublisher;
    }

    public List<Booking> listAll(String userId) {
        if (userId == null || userId.isBlank()) {
            return bookingRepository.findAll();
        }
        return bookingRepository.findByUserId(userId);
    }

    public Booking createBooking(String userId, String hotelId, String promoCode) {
        log.info("Creating booking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);

        validateUser(userId);
        validateHotel(hotelId);

        double basePrice = resolveBasePrice(userId);
        double discount = resolvePromoDiscount(promoCode, userId);

        double finalPrice = basePrice - discount;
        log.info("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);

        Booking booking = new Booking();
        booking.setUserId(userId);
        booking.setHotelId(hotelId);
        booking.setPromoCode(promoCode == null || promoCode.isBlank() ? null : promoCode);
        booking.setDiscountPercent(discount);
        booking.setPrice(finalPrice);
        booking.setCreatedAt(Instant.now());

        Booking saved = bookingRepository.save(booking);
        eventPublisher.publishBookingCreated(saved);
        return saved;
    }

    private void validateUser(String userId) {
        if (!monolithClient.isUserActive(userId)) {
            log.warn("User {} is inactive", userId);
            throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("User is inactive"));
        }
        if (monolithClient.isUserBlacklisted(userId)) {
            log.warn("User {} is blacklisted", userId);
            throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("User is blacklisted"));
        }
    }

    private void validateHotel(String hotelId) {
        if (!monolithClient.isHotelOperational(hotelId)) {
            log.warn("Hotel {} is not operational", hotelId);
            throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("Hotel is not operational"));
        }
        if (!monolithClient.isTrustedHotel(hotelId)) {
            log.warn("Hotel {} is not trusted", hotelId);
            throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("Hotel is not trusted based on reviews"));
        }
        if (monolithClient.isHotelFullyBooked(hotelId)) {
            log.warn("Hotel {} is fully booked", hotelId);
            throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("Hotel is fully booked"));
        }
    }

    private double resolveBasePrice(String userId) {
        String status = monolithClient.getUserStatus(userId);
        boolean isVip = "VIP".equalsIgnoreCase(status);
        log.debug("User {} has status '{}', base price is {}", userId, status, isVip ? 80.0 : 100.0);
        return isVip ? 80.0 : 100.0;
    }

    private double resolvePromoDiscount(String promoCode, String userId) {
        if (promoCode == null || promoCode.isBlank()) {
            return 0.0;
        }
        Double discount = monolithClient.validatePromo(promoCode, userId);
        if (discount == null) {
            log.info("Promo code '{}' is invalid or not applicable for user {}", promoCode, userId);
            return 0.0;
        }
        log.debug("Promo code '{}' applied with discount {}", promoCode, discount);
        return discount;
    }
}