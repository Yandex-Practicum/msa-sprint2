package com.hotelio.service;

import com.hotelio.entity.BookingEntity;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@GrpcService
public class BookingGrpcService extends BookingServiceGrpc.BookingServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(BookingGrpcService.class);

    private final BookingService bookingService;   // ваш доменный сервис

    public BookingGrpcService(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @Override
    public void createBooking(BookingRequest request,
                              StreamObserver<BookingResponse> responseObserver) {
        log.info("gRPC createBooking: userId={}, hotelId={}, promoCode={}",
                request.getUserId(), request.getHotelId(), request.getPromoCode());

        try {
            BookingEntity booking = bookingService.createBooking(
                    request.getUserId(),
                    request.getHotelId(),
                    request.getPromoCode().isBlank() ? null : request.getPromoCode()
            );

            BookingResponse response = BookingResponse.newBuilder()
                    .setId(booking.getId().toString())
                    .setUserId(booking.getUserId())
                    .setHotelId(booking.getHotelId())
                    .setPromoCode(booking.getPromoCode() != null ? booking.getPromoCode() : "")
                    .setDiscountPercent(booking.getDiscountPercent())
                    .setPrice(booking.getPrice())
                    .setCreatedAt(String.valueOf(booking.getCreatedAt()))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (IllegalArgumentException e) {
            // клиентская ошибка → INVALID_ARGUMENT (аналог 400)
            log.warn("Invalid booking request: {}", e.getMessage());
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        } catch (Exception e) {
            // внутренняя ошибка → INTERNAL (аналог 500)
            log.error("Booking creation failed", e);
            responseObserver.onError(Status.INTERNAL
                    .withDescription("Booking creation failed")
                    .asRuntimeException());
        }
    }
}
