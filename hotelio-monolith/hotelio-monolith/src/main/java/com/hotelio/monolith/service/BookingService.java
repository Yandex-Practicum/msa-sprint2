package com.hotelio.monolith.service;

import com.hotelio.monolith.entity.Booking;
import com.hotelio.monolith.entity.PromoCode;
import com.hotelio.monolith.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final PromoCodeService promoCodeService;
    private final ReviewService reviewService;
    private final AppUserService userService;
    private final HotelService hotelService;

    public BookingService(
            BookingRepository bookingRepository,
            PromoCodeService promoCodeService,
            ReviewService reviewService,
            AppUserService userService,
            HotelService hotelService
    ) {
        this.bookingRepository = bookingRepository;
        this.promoCodeService = promoCodeService;
        this.reviewService = reviewService;
        this.userService = userService;
        this.hotelService = hotelService;
    }

    public List<Booking> listAll(String userId) {
        return userId != null ? bookingRepository.findByUserId(userId) : bookingRepository.findAll();
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
        booking.setPromoCode(promoCode);
        booking.setDiscountPercent(discount);
        booking.setPrice(finalPrice);

        return bookingRepository.save(booking);
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
