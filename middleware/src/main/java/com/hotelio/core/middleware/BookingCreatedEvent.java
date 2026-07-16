package com.hotelio.core.middleware;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingCreatedEvent {

    private Long bookingId;
    private String userId;
    private String hotelId;
    private String promoCode;
    private Double discountPercent;
    private Double price;
    private String createdAt;
}
