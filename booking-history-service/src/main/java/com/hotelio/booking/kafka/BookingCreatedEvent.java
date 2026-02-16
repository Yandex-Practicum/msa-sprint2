package com.hotelio.booking.kafka;

import java.time.Instant;

public class BookingCreatedEvent {

    private Long bookingId;
    private String userId;
    private String hotelId;
    private Double discountPercent;
    private Double price;
    private String createdAt;

    public BookingCreatedEvent() {
    }

    public Long getBookingId() {
        return bookingId;
    }

    public String getUserId() {
        return userId;
    }

    public String getHotelId() {
        return hotelId;
    }

    public Double getDiscountPercent() {
        return discountPercent;
    }

    public Double getPrice() {
        return price;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}