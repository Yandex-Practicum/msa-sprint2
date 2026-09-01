package com.hotelio.bookingservice.grpc;

import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.bookingservice.service.BookingService;
import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingListResponse;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class BookingGrpcService extends BookingServiceGrpc.BookingServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(BookingGrpcService.class);

    private final BookingService bookingService;

    public BookingGrpcService(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        log.info("gRPC CreateBooking: userId={}, hotelId={}, promoCode={}",
                request.getUserId(), request.getHotelId(), request.getPromoCode());

        String promoCode = emptyToNull(request.getPromoCode());

        try {
            Booking booking = bookingService.createBooking(request.getUserId(), request.getHotelId(), promoCode);
            responseObserver.onNext(toProto(booking));
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(toStatusException(e));
        }
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        log.info("gRPC ListBookings: userId={}", request.getUserId());

        try {
            String userId = emptyToNull(request.getUserId());
            List<Booking> bookings = bookingService.listAll(userId);

            BookingListResponse.Builder responseBuilder = BookingListResponse.newBuilder();
            for (Booking booking : bookings) {
                responseBuilder.addBookings(toProto(booking));
            }

            responseObserver.onNext(responseBuilder.build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(toStatusException(e));
        }
    }

    private BookingResponse toProto(Booking booking) {
        BookingResponse.Builder builder = BookingResponse.newBuilder()
                .setId(String.valueOf(booking.getId()))
                .setUserId(booking.getUserId())
                .setHotelId(booking.getHotelId())
                .setPromoCode(nullToEmpty(booking.getPromoCode()))
                .setDiscountPercent(booking.getDiscountPercent() != null ? booking.getDiscountPercent() : 0.0)
                .setPrice(booking.getPrice() != null ? booking.getPrice() : 0.0);

        Instant createdAt = booking.getCreatedAt() != null ? booking.getCreatedAt() : Instant.now();
        builder.setCreatedAt(createdAt.toString());

        return builder.build();
    }

    private StatusException toStatusException(Exception e) {
        Throwable cause = e.getCause() != null ? e.getCause() : e;
        if (cause instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT.withDescription(cause.getMessage()).asException();
        }
        return Status.INTERNAL.withDescription(e.getMessage()).asException();
    }

    private static String emptyToNull(String value) {
        return (value == null || value.isEmpty()) ? null : value;
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}