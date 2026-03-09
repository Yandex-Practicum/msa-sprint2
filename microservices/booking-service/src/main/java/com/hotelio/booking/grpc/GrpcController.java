package com.hotelio.booking.grpc;

import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.service.BookingService;
import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingListResponse;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;

@GrpcService
public class GrpcController extends BookingServiceGrpc.BookingServiceImplBase {
    private final BookingService bookingService;

    public GrpcController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        Booking booking = bookingService.createBooking(
                request.getUserId(),
                request.getHotelId(),
                request.getPromoCode()
        );

        BookingResponse response = BookingResponse.newBuilder()
                .setId(String.valueOf(booking.getId()))
                .setUserId(booking.getUserId())
                .setHotelId(booking.getHotelId())
                .setPromoCode(booking.getPromoCode() != null ? booking.getPromoCode() : "")
                .setDiscountPercent(booking.getDiscountPercent())
                .setPrice(booking.getPrice())
                .setCreatedAt(booking.getCreatedAt().toString())
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        List<Booking> result = bookingService.listAll(request.getUserId());
        BookingListResponse.Builder builder = BookingListResponse.newBuilder();

        result.stream().map(booking -> {
            return BookingResponse.newBuilder()
                    .setId(String.valueOf(booking.getId()))
                    .setUserId(booking.getUserId())
                    .setHotelId(booking.getHotelId())
                    .setPromoCode(booking.getPromoCode() != null ? booking.getPromoCode() : "")
                    .setDiscountPercent(booking.getDiscountPercent())
                    .setPrice(booking.getPrice())
                    .setCreatedAt(booking.getCreatedAt().toString())
                    .build();
        }).forEach(builder::addBookings);

        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }
}
