package com.hotelio.bookinghistory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "booking_history")
public class BookingHistoryEntity {

    @Id
    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "hotel_id", nullable = false)
    private String hotelId;

    @Column(name = "promo_code")
    private String promoCode;

    @Column(name = "discount_percent", nullable = false)
    private double discountPercent;

    @Column(name = "price", nullable = false)
    private double price;

    @Column(name = "created_at", nullable = false)
    private String createdAt;

    public BookingHistoryEntity() {
    }

    public Long getBookingId() {
        return bookingId;
    }

    public void setBookingId(Long bookingId) {
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