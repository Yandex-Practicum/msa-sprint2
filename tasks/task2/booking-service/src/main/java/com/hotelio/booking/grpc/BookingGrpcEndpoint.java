package com.hotelio.booking.grpc;

import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.service.BookingService;
import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingListResponse;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BookingGrpcEndpoint extends BookingServiceGrpc.BookingServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(BookingGrpcEndpoint.class);

    private final BookingService bookingService;

    public BookingGrpcEndpoint(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        log.info("gRPC CreateBooking: userId={}, hotelId={}, promoCode='{}'",
                request.getUserId(), request.getHotelId(), request.getPromoCode());
        try {
            Booking booking = bookingService.createBooking(
                    request.getUserId(), request.getHotelId(), request.getPromoCode());
            responseObserver.onNext(toResponse(booking));
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        String userId = request.getUserId();
        log.info("gRPC ListBookings: userId='{}'", userId);
        try {
            List<Booking> bookings = bookingService.listAll(normalize(userId));
            BookingListResponse.Builder builder = BookingListResponse.newBuilder();
            for (Booking booking : bookings) {
                builder.addBookings(toResponse(booking));
            }
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }

    private String normalize(String value) {
        return value == null || value.isEmpty() ? null : value;
    }

    private BookingResponse toResponse(Booking b) {
        return BookingResponse.newBuilder()
                .setId(String.valueOf(b.getId()))
                .setUserId(b.getUserId())
                .setHotelId(b.getHotelId())
                .setPromoCode(b.getPromoCode() == null ? "" : b.getPromoCode())
                .setDiscountPercent(b.getDiscountPercent() == null ? 0.0 : b.getDiscountPercent())
                .setPrice(b.getPrice() == null ? 0.0 : b.getPrice())
                .setCreatedAt(b.getCreatedAt() == null ? "" : b.getCreatedAt().toString())
                .build();
    }
}