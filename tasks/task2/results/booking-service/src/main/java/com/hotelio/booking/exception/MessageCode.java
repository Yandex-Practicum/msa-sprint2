package com.hotelio.booking.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MessageCode {

    USER_INACTIVE("User is inactive"),
    USER_BLACKLISTED("User is blacklisted"),
    HOTEL_NOT_OPERATIONAL("Hotel is not operational"),
    HOTEL_NOT_TRUSTED("Hotel is not trusted based on reviews"),
    HOTEL_FULLY_BOOKED("Hotel is fully booked"),
    MONOLITH_UNAVAILABLE("Monolith is unavailable, booking data cannot be verified");

    private final String message;
}
