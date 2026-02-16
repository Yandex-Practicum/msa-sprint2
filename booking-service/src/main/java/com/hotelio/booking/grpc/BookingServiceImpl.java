package com.hotelio.booking.grpc;

import com.hotelio.proto.booking.*;
import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.repository.BookingRepository;
import com.hotelio.booking.kafka.*;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@GrpcService
public class BookingServiceImpl extends BookingServiceGrpc.BookingServiceImplBase {
    @Autowired
    private final BookingRepository repository;

    private final WebClient userServiceWebClient;
    private final BookingEventProducer bookingEventProducer;

    public BookingServiceImpl(BookingRepository repository,
                              WebClient userServiceWebClient,
                              BookingEventProducer bookingEventProducer) {
        this.repository = repository;
        this.userServiceWebClient = userServiceWebClient;
        this.bookingEventProducer = bookingEventProducer;
    }

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        Status isBlackListed = validatePermission("/api/users/{userId}/blacklisted", request.getUserId(), Boolean.TRUE, responseObserver, "User is blacklisted", "User service unavailable");
        Status isActive = validatePermission("/api/users/{userId}/active", request.getUserId(), Boolean.FALSE, responseObserver, "User is not active", "User service unavailable");
        Status isOperational = validatePermission("/api/hotels/{hotelId}/operational", request.getHotelId(), Boolean.FALSE, responseObserver, "Hotel is not operational", "Hotel service unavailable");
        Status isFullyBooked = validatePermission("/api/hotels/{hotelId}/fully-booked", request.getHotelId(), Boolean.TRUE, responseObserver, "Hotel is fully booked", "Hotel service unavailable");
        
        if ((isBlackListed != Status.OK) || (isActive != Status.OK) || (isOperational != Status.OK) || (isFullyBooked != Status.OK))
            return;

        Booking booking = new Booking();
        booking.setUserId(request.getUserId());
        booking.setHotelId(request.getHotelId());
        booking.setPromoCode(request.getPromoCode());
        booking.setDiscountPercent(0.0);
        booking.setPrice(100.0);
        booking.setCreatedAt(Instant.now());

        Booking saved = repository.save(booking);

        bookingEventProducer.sendBookingCreated(
            new BookingCreatedEvent(
                saved.getId(),
                saved.getUserId(),
                saved.getHotelId(),
                saved.getDiscountPercent(),
                saved.getPrice(),
                saved.getCreatedAt().toString()
            )
        );

        BookingResponse resp = BookingResponse.newBuilder()
                .setId(saved.getId().toString())
                .setUserId(saved.getUserId())
                .setHotelId(saved.getHotelId())
                .setPromoCode(saved.getPromoCode())
                .setDiscountPercent(saved.getDiscountPercent())
                .setPrice(saved.getPrice())
                .setCreatedAt(saved.getCreatedAt().toString())
                .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        List<Booking> list = repository.findByUserId(request.getUserId());

        BookingListResponse.Builder builder = BookingListResponse.newBuilder();
        for (Booking b : list) {
            builder.addBookings(BookingResponse.newBuilder()
                    .setId(b.getId().toString())
                    .setUserId(b.getUserId())
                    .setHotelId(b.getHotelId())
                    .setPromoCode(b.getPromoCode())
                    .setDiscountPercent(b.getDiscountPercent())
                    .setPrice(b.getPrice())
                    .setCreatedAt(b.getCreatedAt().toString())
            );
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    private Status validatePermission(String uri, String uid, boolean except, StreamObserver<BookingResponse> responseObserver, String permErrMsg, String unavailErr) {
        boolean isBad;
        
        try {
            isBad = userServiceWebClient
                    .get()
                    .uri(uri, uid)
                    .retrieve()
                    .bodyToMono(Boolean.class)
                    .block();
        } catch (Exception ex) {
            responseObserver.onError(
                    Status.UNAVAILABLE
                            .withDescription(permErrMsg)
                            .withCause(ex)
                            .asRuntimeException()
            );
            return Status.UNAVAILABLE;
        }

        if (except == isBad) {
            responseObserver.onError(
                    Status.PERMISSION_DENIED
                            .withDescription(unavailErr)
                            .asRuntimeException()
            );
            return Status.PERMISSION_DENIED;
        }
        else {
            return Status.OK;
        }
    }
}