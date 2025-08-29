package com.hotelio.bookinghistory.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "booking_events")
public class BookingEvent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String eventType;
    
    @Column(nullable = false)
    private String userId;
    
    @Column(nullable = false)
    private String hotelId;
    
    private String promoCode;
    
    private Double price;
    
    private Double discountPercent;
    
    @Column(nullable = false)
    private Instant timestamp;
    
    @Column(nullable = false)
    private Instant processedAt;
    
    // Конструкторы
    public BookingEvent() {}
    
    public BookingEvent(String eventType, String userId, String hotelId, String promoCode, 
                       Double price, Double discountPercent, Instant timestamp) {
        this.eventType = eventType;
        this.userId = userId;
        this.hotelId = hotelId;
        this.promoCode = promoCode;
        this.price = price;
        this.discountPercent = discountPercent;
        this.timestamp = timestamp;
        this.processedAt = Instant.now();
    }
    
    // Getters & Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getEventType() {
        return eventType;
    }
    
    public void setEventType(String eventType) {
        this.eventType = eventType;
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
    
    public Double getPrice() {
        return price;
    }
    
    public void setPrice(Double price) {
        this.price = price;
    }
    
    public Double getDiscountPercent() {
        return discountPercent;
    }
    
    public void setDiscountPercent(Double discountPercent) {
        this.discountPercent = discountPercent;
    }
    
    public Instant getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
    
    public Instant getProcessedAt() {
        return processedAt;
    }
    
    public void setProcessedAt(Instant processedAt) {
        this.processedAt = processedAt;
    }
}
