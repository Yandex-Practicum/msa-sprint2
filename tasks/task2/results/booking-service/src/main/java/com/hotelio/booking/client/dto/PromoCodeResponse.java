package com.hotelio.booking.client.dto;

import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class PromoCodeResponse {

    String code;
    double discount;
}
