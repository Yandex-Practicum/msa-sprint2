package com.hotelio.history.mapper;

import com.google.protobuf.Timestamp;
import com.hotelio.history.dto.BookingHistoryResponse;
import com.hotelio.history.dto.BookingStatsResponse;
import com.hotelio.history.entity.BookingHistory;
import com.hotelio.history.repository.BookingStatsView;
import com.hotelio.proto.booking.events.BookingCreated;
import java.time.Instant;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface BookingHistoryMapper {

    @Mapping(target = "createdAt", source = "event.createdAt", qualifiedByName = "toInstant")
    @Mapping(target = "promoCode", source = "event.promoCode", qualifiedByName = "emptyToNull")
    @Mapping(target = "receivedAt", source = "receivedAt")
    BookingHistory toEntity(BookingCreated event, Instant receivedAt);

    BookingHistoryResponse toResponse(BookingHistory history);

    List<BookingHistoryResponse> toResponses(List<BookingHistory> histories);

    BookingStatsResponse toStatsResponse(BookingStatsView view);

    List<BookingStatsResponse> toStatsResponses(List<BookingStatsView> views);

    @Named("toInstant")
    default Instant toInstant(Timestamp timestamp) {
        return Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos());
    }

    // В protobuf нет null: неприменённый промокод приходит пустой строкой.
    @Named("emptyToNull")
    default String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}
