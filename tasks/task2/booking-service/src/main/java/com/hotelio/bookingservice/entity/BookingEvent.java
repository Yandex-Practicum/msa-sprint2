package com.hotelio.bookingservice.entity;

import java.time.Instant;

/**
 * Kafka event emitted when a booking is created.
 * Serialized as JSON via Spring Kafka's JsonSerializer.
 */
public record BookingEvent(
        Long id,
        String userId,
        String hotelId,
        String promoCode,
        Double discountPercent,
        Double price,
        Instant createdAt
) {

    public static BookingEvent from(Booking booking) {
        return new BookingEvent(
                booking.getId(),
                booking.getUserId(),
                booking.getHotelId(),
                booking.getPromoCode(),
                booking.getDiscountPercent(),
                booking.getPrice(),
                booking.getCreatedAt()
        );
    }
}