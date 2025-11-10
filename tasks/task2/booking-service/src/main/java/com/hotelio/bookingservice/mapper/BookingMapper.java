package com.hotelio.bookingservice.mapper;

import com.hotelio.bookingservice.dto.BookingEvent;
import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.proto.booking.BookingResponse;

public class BookingMapper {
    public static BookingResponse toBookingResponse(Booking booking) {
        return BookingResponse.newBuilder()
                .setId(booking.getId().toString())
                .setUserId(booking.getUserId())
                .setHotelId(booking.getHotelId())
                .setPromoCode(booking.getPromoCode() != null ? booking.getPromoCode() : "")
                .setDiscountPercent(booking.getDiscountPercent())
                .setPrice(booking.getPrice())
                .setCreatedAt(booking.getCreatedAt().toString())
                .build();
    }

    public static BookingEvent toBookingEvent(Booking booking) {
        BookingEvent event = new BookingEvent();
        event.setId(booking.getId());
        event.setUserId(booking.getUserId());
        event.setHotelId(booking.getHotelId());
        event.setPromoCode(booking.getPromoCode());
        event.setDiscountPercent(booking.getDiscountPercent());
        event.setPrice(booking.getPrice());
        event.setCreatedAt(booking.getCreatedAt().toString());
        return event;
    }
}
