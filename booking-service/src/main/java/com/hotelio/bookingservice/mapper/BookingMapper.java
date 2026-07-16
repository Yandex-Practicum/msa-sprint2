package com.hotelio.bookingservice.mapper;

import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.core.middleware.BookingCreatedEvent;
import com.hotelio.proto.booking.BookingResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.time.Instant;
import java.time.format.DateTimeFormatter;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_DEFAULT)
public interface BookingMapper {

    @Mapping(target = "userId", source = "userId", defaultValue = "")
    @Mapping(target = "hotelId", source = "hotelId", defaultValue = "")
    @Mapping(target = "promoCode", source = "promoCode", defaultValue = "")
    @Mapping(target = "discountPercent", source = "discountPercent", defaultValue = "0.0")
    @Mapping(target = "price", source = "price", defaultValue = "0.0")
    BookingResponse pojoToProto(Booking booking);

    @Mapping(source = "id", target = "bookingId")
    BookingCreatedEvent pojoToEvent(Booking booking);

    default String map(Instant instant) {
        return (instant == null ? Instant.now() : DateTimeFormatter.ISO_INSTANT.format(instant)).toString();
    }
}
