package com.hotelio.booking.client.dto;

import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class UserResponse {

    String id;
    String status;
    boolean active;
    boolean blacklisted;
}
