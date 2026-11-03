package com.hotelio.booking.exception;

import lombok.Getter;

@Getter
public abstract class HotelioException extends RuntimeException {

    private final MessageCode messageCode;

    protected HotelioException(MessageCode messageCode) {
        super(messageCode.getMessage());
        this.messageCode = messageCode;
    }

    protected HotelioException(MessageCode messageCode, Throwable cause) {
        super(messageCode.getMessage(), cause);
        this.messageCode = messageCode;
    }
}
