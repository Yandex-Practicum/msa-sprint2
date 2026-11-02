package com.hotelio.monolith.dto;

import java.time.Instant;

public record CreateBookingResponse(
        Long id,
        String userId,
        String hotelId,
        String promoCode,
        Double discountPercent,
        Double price,
        Instant createdAt
) {
}
