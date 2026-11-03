package com.hotelio.booking.grpc;

import com.hotelio.booking.mapper.BookingGrpcMapper;
import com.hotelio.booking.service.BookingService;
import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingListResponse;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

@Slf4j
@GrpcService
@RequiredArgsConstructor
public class BookingGrpcService extends BookingServiceGrpc.BookingServiceImplBase {

    private final BookingService bookingService;
    private final BookingGrpcMapper bookingGrpcMapper;

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        var booking = bookingService.createBooking(request.getUserId(), request.getHotelId(), request.getPromoCode());

        responseObserver.onNext(bookingGrpcMapper.toResponse(booking));
        responseObserver.onCompleted();
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        log.info("Listing bookings: userId={}", request.getUserId());

        var bookings = bookingService.listBookings(request.getUserId());

        responseObserver.onNext(bookingGrpcMapper.toListResponse(bookings));
        responseObserver.onCompleted();
    }
}
