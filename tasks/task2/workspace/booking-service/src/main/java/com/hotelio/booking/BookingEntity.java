package com.hotelio.booking;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "bookings")
public class BookingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String userId;
    @Column(nullable = false) private String hotelId;
    private String promoCode;
    @Column(nullable = false) private double discountPercent;
    @Column(nullable = false) private double price;
    @Column(nullable = false) private OffsetDateTime createdAt = OffsetDateTime.now();

    public Long getId() { return id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getHotelId() { return hotelId; }
    public void setHotelId(String hotelId) { this.hotelId = hotelId; }
    public String getPromoCode() { return promoCode; }
    public void setPromoCode(String promoCode) { this.promoCode = promoCode; }
    public double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(double discountPercent) { this.discountPercent = discountPercent; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
