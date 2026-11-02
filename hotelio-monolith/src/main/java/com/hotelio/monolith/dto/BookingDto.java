package com.hotelio.monolith.dto;

import java.time.Instant;

public record BookingDto(
        Long id,
        String userId,
        String hotelId,
        String promoCode,
        Double discountPercent,
        Double price,
        Instant createdAt
) {
}