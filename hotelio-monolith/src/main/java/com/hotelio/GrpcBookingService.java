package com.hotelio;

import com.hotelio.monolith.entity.Booking;
import com.hotelio.monolith.repository.BookingRepository;
import com.hotelio.monolith.service.BookingService;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.List;

public class GrpcBookingService extends BookingService {

    private static final Logger logger = LoggerFactory.getLogger(GrpcBookingService.class);

    private final BookingServiceGrpc.BookingServiceBlockingStub stub;
    private final BookingRepository bookingRepository;

    public GrpcBookingService(BookingServiceGrpc.BookingServiceBlockingStub stub,
                               BookingRepository bookingRepository) {
        super(null, null, null, null, null);
        logger.info("Using GRPC BookingService");
        this.stub = stub;
        this.bookingRepository = bookingRepository;
    }

    /**
     * GET /api/bookings — reads from local monolith DB (supports fixtures and migration coexistence).
     */
    @Override
    public List<Booking> listAll(String userId) {
        return userId != null ? bookingRepository.findByUserId(userId) : bookingRepository.findAll();
    }

    /**
     * POST /api/bookings — delegates to external gRPC booking-service.
     */
    @Override
    public Booking createBooking(String userId, String hotelId, String promoCode) {
        BookingRequest request = BookingRequest.newBuilder()
                .setUserId(userId)
                .setHotelId(hotelId)
                .setPromoCode(promoCode != null ? promoCode : "")
                .build();
        BookingResponse response = stub.createBooking(request);
        return toBooking(response);
    }

    private Booking toBooking(BookingResponse response) {
        Booking booking = new Booking();
        String id = response.getId();
        if (id != null && !id.isBlank()) {
            booking.setId(Long.parseLong(id));
        }
        booking.setUserId(response.getUserId());
        booking.setHotelId(response.getHotelId());
        booking.setPromoCode(response.getPromoCode().isEmpty() ? null : response.getPromoCode());
        booking.setDiscountPercent(response.getDiscountPercent());
        booking.setPrice(response.getPrice());
        String createdAtStr = response.getCreatedAt();
        if (createdAtStr != null && !createdAtStr.isBlank()) {
            try {
                booking.setCreatedAt(Instant.parse(createdAtStr));
            } catch (Exception e) {
                booking.setCreatedAt(Instant.now());
            }
        }
        return booking;
    }
}
