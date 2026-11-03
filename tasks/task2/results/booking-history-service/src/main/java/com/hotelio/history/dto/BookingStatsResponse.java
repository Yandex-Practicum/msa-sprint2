package com.hotelio.history.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class BookingStatsResponse {

    String dimension;
    long bookings;
    double revenue;
    double discounts;
}
