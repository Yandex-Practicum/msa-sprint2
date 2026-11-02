package com.hotelio.monolith.client;

import com.hotelio.monolith.dto.CreateBookingResponse;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class BookingGrpcClient {

    private final ManagedChannel channel;
    private final BookingServiceGrpc.BookingServiceBlockingStub blockingStub;

    public BookingGrpcClient(
            @Value("${grpc.client.booking.host:booking-service}") String host,
            @Value("${grpc.client.booking.port:9090}") int port) {
        this.channel = ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()
                .build();
        this.blockingStub = BookingServiceGrpc.newBlockingStub(channel);
    }

    public BookingResponse createBooking(String userId, String hotelId, String promoCode) {
        BookingRequest request = BookingRequest.newBuilder()
                .setUserId(userId)
                .setHotelId(hotelId)
                .setPromoCode(promoCode == null ? "" : promoCode)
                .build();

        try {
            return blockingStub.withDeadlineAfter(5, TimeUnit.SECONDS)
                    .createBooking(request);
        } catch (StatusRuntimeException e) {
            throw new RuntimeException("gRPC call failed: " + e.getStatus(), e);
        }
    }

    @PreDestroy
    public void shutdown() {
        channel.shutdown();
    }
}
