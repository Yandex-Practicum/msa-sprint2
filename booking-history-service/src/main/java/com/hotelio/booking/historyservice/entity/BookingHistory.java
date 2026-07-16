package com.hotelio.booking.historyservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Setter
@Getter
@Entity
@Table(name = "booking_history")
public class BookingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long bookingId;
    private String userId;
    private String hotelId;
    private String promoCode;
    private Double discountPercent;
    private Double price;
    private String createdAt;

}

