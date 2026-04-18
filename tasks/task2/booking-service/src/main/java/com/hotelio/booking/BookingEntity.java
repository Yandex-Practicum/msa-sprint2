package com.hotelio.booking;

import jakarta.persistence.*;

@Entity
@Table(name = "booking")
public class BookingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    public BookingEntity() {
    }

    public BookingEntity(String userId, String hotelId, String promoCode, double discountPercent, double price, String createdAt) {
        this.userId = userId;
        this.hotelId = hotelId;
        this.promoCode = promoCode;
        this.discountPercent = discountPercent;
        this.price = price;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getHotelId() {
        return hotelId;
    }

    public String getPromoCode() {
        return promoCode;
    }

    public double getDiscountPercent() {
        return discountPercent;
    }

    public double getPrice() {
        return price;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setHotelId(String hotelId) {
        this.hotelId = hotelId;
    }

    public void setPromoCode(String promoCode) {
        this.promoCode = promoCode;
    }

    public void setDiscountPercent(double discountPercent) {
        this.discountPercent = discountPercent;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}