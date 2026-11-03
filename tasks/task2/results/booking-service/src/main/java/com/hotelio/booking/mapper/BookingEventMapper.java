package com.hotelio.booking.mapper;

import com.google.protobuf.Timestamp;
import com.hotelio.booking.entity.Booking;
import com.hotelio.proto.booking.events.BookingCreated;
import java.time.Instant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = "spring",
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface BookingEventMapper {

    @Mapping(target = "eventId", expression = "java(java.util.UUID.randomUUID().toString())")
    @Mapping(target = "bookingId", source = "booking.id")
    @Mapping(target = "userId", source = "booking.userId")
    @Mapping(target = "hotelId", source = "booking.hotelId")
    @Mapping(target = "createdAt", source = "booking.createdAt", qualifiedByName = "toTimestamp")
    @Mapping(target = "basePrice", source = "basePrice")
    @Mapping(target = "discount", source = "booking.discountPercent")
    @Mapping(target = "price", source = "booking.price")
    @Mapping(target = "promoCode", source = "booking.promoCode")
    @Mapping(target = "userStatus", source = "userStatus")
    @Mapping(target = "hotelCity", source = "hotelCity")
    BookingCreated toBookingCreated(
        Booking booking,
        double basePrice,
        String userStatus,
        String hotelCity
    );

    @Named("toTimestamp")
    default Timestamp toTimestamp(Instant instant) {
        return Timestamp.newBuilder()
            .setSeconds(instant.getEpochSecond())
            .setNanos(instant.getNano())
            .build();
    }
}
