package com.hotelio.history.dto;

import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class BookingHistoryResponse {

    String bookingId;
    String userId;
    String hotelId;
    Instant createdAt;
    Double basePrice;
    Double discount;
    Double price;
    String promoCode;
    String userStatus;
    String hotelCity;
}
