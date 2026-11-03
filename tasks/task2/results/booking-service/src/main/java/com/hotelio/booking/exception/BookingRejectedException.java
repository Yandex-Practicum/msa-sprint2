package com.hotelio.booking.exception;

public class BookingRejectedException extends HotelioException {

    public BookingRejectedException(MessageCode messageCode) {
        super(messageCode);
    }
}
