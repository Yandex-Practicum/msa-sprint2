package com.hotelio.monolith.grpc;

import com.hotelio.monolith.entity.Booking;
import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@Profile("grpc-booking")
public class GrpcBookingService {

    private final ManagedChannel channel;
    private final BookingServiceGrpc.BookingServiceBlockingStub stub;

    public GrpcBookingService(
            @Value("${BOOKING_SERVICE_EXTERNAL_HOST}") String host,
            @Value("${BOOKING_SERVICE_EXTERNAL_PORT:9090}") int port
    ) {
        this.channel = ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()
                .build();
        this.stub = BookingServiceGrpc.newBlockingStub(channel);
    }

    @PreDestroy
    public void shutdown() {
        channel.shutdown();
    }

    public Booking createBooking(String userId, String hotelId, String promoCode) {
        try {
            BookingRequest.Builder b = BookingRequest.newBuilder()
                    .setUserId(userId)
                    .setHotelId(hotelId);
            if (promoCode != null) {
                b.setPromoCode(promoCode);
            }
            BookingResponse r = stub.createBooking(b.build());
            return toEntity(r);
        } catch (StatusRuntimeException e) {
            throw mapGrpcError(e);
        }
    }

    public List<Booking> listBookings(String userId) {
        try {
            BookingListRequest req = BookingListRequest.newBuilder()
                    .setUserId(userId != null ? userId : "")
                    .build();
            var resp = stub.listBookings(req);
            List<Booking> out = new ArrayList<>();
            for (BookingResponse r : resp.getBookingsList()) {
                out.add(toEntity(r));
            }
            return out;
        } catch (StatusRuntimeException e) {
            throw mapGrpcError(e);
        }
    }

    private static RuntimeException mapGrpcError(StatusRuntimeException e) {
        return switch (e.getStatus().getCode()) {
            case INVALID_ARGUMENT -> new IllegalArgumentException(
                    e.getStatus().getDescription() != null ? e.getStatus().getDescription() : e.getMessage()
            );
            default -> new RuntimeException("gRPC error: " + e.getStatus(), e);
        };
    }

    private static Booking toEntity(BookingResponse r) {
        Booking b = new Booking();
        b.setId(Long.parseLong(r.getId()));
        b.setUserId(r.getUserId());
        b.setHotelId(r.getHotelId());
        if (!r.getPromoCode().isEmpty()) {
            b.setPromoCode(r.getPromoCode());
        }
        b.setDiscountPercent(r.getDiscountPercent());
        b.setPrice(r.getPrice());
        b.setCreatedAt(Instant.parse(r.getCreatedAt()));
        return b;
    }
}
