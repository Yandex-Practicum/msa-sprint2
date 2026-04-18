package com.hotelio.booking;

public class BookingCreatedEvent {

    private String bookingId;
    private String userId;
    private String hotelId;
    private String promoCode;
    private double discountPercent;
    private double price;
    private String createdAt;

    public BookingCreatedEvent() {
    }

    public BookingCreatedEvent(
            String bookingId,
            String userId,
            String hotelId,
            String promoCode,
            double discountPercent,
            double price,
            String createdAt
    ) {
        this.bookingId = bookingId;
        this.userId = userId;
        this.hotelId = hotelId;
        this.promoCode = promoCode;
        this.discountPercent = discountPercent;
        this.price = price;
        this.createdAt = createdAt;
    }

    public String getBookingId() {
        return bookingId;
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getHotelId() {
        return hotelId;
    }

    public void setHotelId(String hotelId) {
        this.hotelId = hotelId;
    }

    public String getPromoCode() {
        return promoCode;
    }

    public void setPromoCode(String promoCode) {
        this.promoCode = promoCode;
    }

    public double getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(double discountPercent) {
        this.discountPercent = discountPercent;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}