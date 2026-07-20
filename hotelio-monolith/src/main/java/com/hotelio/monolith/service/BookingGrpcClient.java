package com.hotelio.monolith.service;

import com.hotelio.monolith.entity.Booking;
import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class BookingGrpcClient {

    private final ManagedChannel channel;
    private final BookingServiceGrpc.BookingServiceBlockingStub stub;
    private final boolean enabled;

    public BookingGrpcClient(
            @Value("${booking.service.external-host:}") String host,
            @Value("${booking.service.external-port:0}") int port
    ) {
        this.enabled = host != null && !host.isBlank() && port > 0;
        if (enabled) {
            this.channel = ManagedChannelBuilder.forAddress(host, port)
                    .usePlaintext()
                    .build();
            this.stub = BookingServiceGrpc.newBlockingStub(channel);
        } else {
            this.channel = null;
            this.stub = null;
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public List<Booking> listBookings(String userId) {
        return stub.listBookings(BookingListRequest.newBuilder()
                        .setUserId(userId)
                        .build())
                .getBookingsList()
                .stream()
                .map(this::toBooking)
                .collect(Collectors.toList());
    }

    public Booking createBooking(String userId, String hotelId, String promoCode) {
        BookingResponse response = stub.createBooking(BookingRequest.newBuilder()
                .setUserId(userId)
                .setHotelId(hotelId)
                .setPromoCode(promoCode == null ? "" : promoCode)
                .build());
        return toBooking(response);
    }

    @PreDestroy
    public void shutdown() {
        if (channel != null) {
            channel.shutdownNow();
        }
    }

    private Booking toBooking(BookingResponse response) {
        Booking booking = new Booking();
        booking.setId(parseGrpcId(response.getId()));
        booking.setUserId(response.getUserId());
        booking.setHotelId(response.getHotelId());
        booking.setPromoCode(response.getPromoCode().isBlank() ? null : response.getPromoCode());
        booking.setDiscountPercent(response.getDiscountPercent());
        booking.setPrice(response.getPrice());
        booking.setCreatedAt(response.getCreatedAt().isBlank() ? null : Instant.parse(response.getCreatedAt()));
        return booking;
    }


    private Long parseGrpcId(String id) {
        if (id == null || id.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(id);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
