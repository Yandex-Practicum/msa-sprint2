package com.hotelio.booking.exception;

public class MonolithUnavailableException extends HotelioException {

    public MonolithUnavailableException(Throwable cause) {
        super(MessageCode.MONOLITH_UNAVAILABLE, cause);
    }
}
