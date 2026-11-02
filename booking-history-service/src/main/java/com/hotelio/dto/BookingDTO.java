package com.hotelio.dto;

import java.time.Instant;

public record BookingDTO(
        Long id,
        String userId,
        String hotelId,
        String promoCode,
        Double discountPercent,
        Double price,
        Instant createdAt
) {
}
