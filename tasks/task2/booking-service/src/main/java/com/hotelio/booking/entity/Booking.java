package com.hotelio.booking.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "bookings")
public class Booking {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String userId;
    
    @Column(nullable = false)
    private String hotelId;
    
    private String promoCode;
    
    private Double discountPercent;
    
    @Column(nullable = false)
    private Double price;
    
    @Column(nullable = false)
    private Instant createdAt;
    
    // Конструкторы
    public Booking() {}
    
    public Booking(String userId, String hotelId, String promoCode, Double discountPercent, Double price) {
        this.userId = userId;
        this.hotelId = hotelId;
        this.promoCode = promoCode;
        this.discountPercent = discountPercent;
        this.price = price;
        this.createdAt = Instant.now();
    }
    
    // Getters & Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
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
    
    public Double getDiscountPercent() {
        return discountPercent;
    }
    
    public void setDiscountPercent(Double discountPercent) {
        this.discountPercent = discountPercent;
    }
    
    public Double getPrice() {
        return price;
    }
    
    public void setPrice(Double price) {
        this.price = price;
    }
    
    public Instant getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
