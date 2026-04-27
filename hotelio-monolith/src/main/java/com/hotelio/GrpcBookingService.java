package com.hotelio;

import com.hotelio.monolith.entity.Booking;
import com.hotelio.monolith.service.BookingService;
import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public class GrpcBookingService extends BookingService {

    private static final Logger logger = LoggerFactory.getLogger(GrpcBookingService.class);

    private final BookingServiceGrpc.BookingServiceBlockingStub stub;

    public GrpcBookingService(BookingServiceGrpc.BookingServiceBlockingStub stub) {
        super(null, null, null, null, null);
        logger.info("Using GRPC BookingService");
        this.stub = stub;
    }

    @Override
    public List<Booking> listAll(String userId) {
        BookingListRequest request = BookingListRequest.newBuilder()
                .setUserId(Optional.ofNullable(userId).orElse(""))
                .build();

        return stub.listBookings(request)
                .getBookingsList()
                .stream()
                .map(this::toBooking)
                .toList();
    }

    @Override
    public Booking createBooking(String userId, String hotelId, String promoCode) {
        BookingRequest request = BookingRequest.newBuilder()
                .setUserId(userId)
                .setHotelId(hotelId)
                .setPromoCode(Optional.ofNullable(promoCode).orElse(""))
                .build();

        return toBooking(stub.createBooking(request));
    }

    private Booking toBooking(BookingResponse response) {
        Booking booking = new Booking();

        String id = response.getId();
        if (!id.isBlank()) {
            booking.setId(Long.parseLong(id));
        }

        booking.setUserId(response.getUserId());
        booking.setHotelId(response.getHotelId());
        booking.setPromoCode(response.getPromoCode());
        booking.setDiscountPercent(response.getDiscountPercent());
        booking.setPrice(response.getPrice());

        String createdAt = response.getCreatedAt();
        if (!createdAt.isBlank()) {
            booking.setCreatedAt(Instant.parse(createdAt));
        }

        return booking;
    }
}
