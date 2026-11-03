package com.hotelio.booking.client.dto;

import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class HotelResponse {

    String id;
    boolean operational;
    String city;
}
