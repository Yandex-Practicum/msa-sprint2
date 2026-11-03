package com.hotelio.booking.mapper;

import com.hotelio.booking.entity.Booking;
import com.hotelio.proto.booking.BookingListResponse;
import com.hotelio.proto.booking.BookingResponse;
import java.time.Instant;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

// Protobuf-сеттеры падают на null, поэтому null-поля не передаются. Служебные свойства protobuf-билдера
// (unknownFields, *Bytes) не маппятся — отсюда unmappedTargetPolicy = IGNORE.
@Mapper(
    componentModel = "spring",
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface BookingGrpcMapper {

    // Прокси монолита разбирает created_at через Instant.parse, поэтому пустая строка недопустима.
    // У перенесённых старых броней даты нет — для них отдаётся начало эпохи.
    String UNKNOWN_CREATED_AT = "1970-01-01T00:00:00Z";

    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "toIsoString", defaultValue = UNKNOWN_CREATED_AT)
    BookingResponse toResponse(Booking booking);

    default BookingListResponse toListResponse(List<Booking> bookings) {
        var responses = bookings.stream()
            .map(this::toResponse)
            .toList();

        return BookingListResponse.newBuilder()
            .addAllBookings(responses)
            .build();
    }

    @Named("toIsoString")
    default String toIsoString(Instant instant) {
        return instant.toString();
    }
}
