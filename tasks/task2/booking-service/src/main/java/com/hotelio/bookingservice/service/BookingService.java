package com.hotelio.bookingservice.service;

import com.google.common.primitives.Longs;
import com.hotelio.bookingservice.connectors.AppUserServiceProxy;
import com.hotelio.bookingservice.connectors.HotelServiceProxy;
import com.hotelio.bookingservice.connectors.PromoCodeServiceProxy;
import com.hotelio.bookingservice.connectors.ReviewServiceProxy;
import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.bookingservice.entity.BookingEvent;
import com.hotelio.bookingservice.entity.PromoCode;
import com.hotelio.bookingservice.kafka.BookingKafkaProducer;
import com.hotelio.bookingservice.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final PromoCodeServiceProxy promoCodeService;
    private final ReviewServiceProxy reviewService;
    private final AppUserServiceProxy userService;
    private final HotelServiceProxy hotelService;
    private final BookingKafkaProducer bookingKafkaProducer;

    public BookingService(
            BookingRepository bookingRepository,
            PromoCodeServiceProxy promoCodeService,
            ReviewServiceProxy reviewService,
            AppUserServiceProxy userService,
            HotelServiceProxy hotelService,
            BookingKafkaProducer bookingKafkaProducer
    ) {
        this.bookingRepository = bookingRepository;
        this.promoCodeService = promoCodeService;
        this.reviewService = reviewService;
        this.userService = userService;
        this.hotelService = hotelService;
        this.bookingKafkaProducer = bookingKafkaProducer;
    }

    public List<Booking> listAll(String userId) {
        return userId != null ? bookingRepository.findByUserId(userId) : bookingRepository.findAll();
    }

    public Optional<Booking> findById(String bookingId) {
        if (bookingId == null) return null;
        Long id = Longs.tryParse(bookingId);
        return id != null ? bookingRepository.findById(id) : Optional.empty();
    }

    public Booking createBooking(String userId, String hotelId, String promoCode) {
        log.info("Creating booking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);

        double basePrice;
        double discount;
        try {
            validateUser(userId);
            validateHotel(hotelId);

            basePrice = resolveBasePrice(userId);
            discount = resolvePromoDiscount(promoCode, userId);
        } catch (Exception e) {
            throw new RuntimeException("Booking request failed with error: " + e.getMessage(), e);
        }

        double finalPrice = basePrice - discount;
        log.info("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);

        Booking booking = new Booking();
        booking.setUserId(userId);
        booking.setHotelId(hotelId);
        booking.setPromoCode(promoCode);
        booking.setDiscountPercent(discount);
        booking.setPrice(finalPrice);
        booking.setCreatedAt(Instant.now());

        Booking saved = bookingRepository.save(booking);

        publishBookingCreatedEvent(saved);

        return saved;
    }

    private void publishBookingCreatedEvent(Booking booking) {
        try {
            bookingKafkaProducer.publishBookingCreated(BookingEvent.from(booking));
        } catch (Exception e) {
            // Best-effort: Kafka publish failure must not break the booking creation flow.
            log.error("Failed to publish booking created event for booking id={}", booking.getId(), e);
        }
    }

    private void validateUser(String userId) {
        if (!userService.isUserActive(userId)) {
            log.warn("User {} is inactive", userId);
            throw new IllegalArgumentException("User is inactive");
        }
        if (userService.isUserBlacklisted(userId)) {
            log.warn("User {} is blacklisted", userId);
            throw new IllegalArgumentException("User is blacklisted");
        }
    }

    private void validateHotel(String hotelId) {
        if (!hotelService.isHotelOperational(hotelId)) {
            log.warn("Hotel {} is not operational", hotelId);
            throw new IllegalArgumentException("Hotel is not operational");
        }
        if (!reviewService.isTrustedHotel(hotelId)) {
            log.warn("Hotel {} is not trusted", hotelId);
            throw new IllegalArgumentException("Hotel is not trusted based on reviews");
        }
        if (hotelService.isHotelFullyBooked(hotelId)) {
            log.warn("Hotel {} is fully booked", hotelId);
            throw new IllegalArgumentException("Hotel is fully booked");
        }
    }

    private double resolveBasePrice(String userId) {
        Optional<String> statusOpt = userService.getUserStatus(userId);
        return statusOpt.map(status -> {
            boolean isVip = status.equalsIgnoreCase("VIP");
            log.debug("User {} has status '{}', base price is {}", userId, status, isVip ? 80.0 : 100.0);
            return isVip ? 80.0 : 100.0;
        }).orElseGet(() -> {
            log.debug("User {} has unknown status, default base price 100.0", userId);
            return 100.0;
        });
    }

    private double resolvePromoDiscount(String promoCode, String userId) {
        if (promoCode == null) return 0.0;

        PromoCode promo = promoCodeService.validate(promoCode, userId);
        if (promo == null) {
            log.info("Promo code '{}' is invalid or not applicable for user {}", promoCode, userId);
            return 0.0;
        }

        log.debug("Promo code '{}' applied with discount {}", promoCode, promo.getDiscount());
        return promo.getDiscount();
    }
}
