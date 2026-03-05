package com.hotelio.booking.grpc;

import com.hotelio.booking.client.MonolithRestClient;
import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.kafka.BookingCreatedEvent;
import com.hotelio.booking.kafka.BookingEventProducer;
import com.hotelio.booking.repository.BookingRepository;
import com.hotelio.proto.booking.*;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.List;

@GrpcService
public class BookingGrpcService extends BookingServiceGrpc.BookingServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(BookingGrpcService.class);

    private final BookingRepository bookingRepository;
    private final MonolithRestClient monolithClient;
    private final BookingEventProducer eventProducer;

    public BookingGrpcService(BookingRepository bookingRepository,
                               MonolithRestClient monolithClient,
                               BookingEventProducer eventProducer) {
        this.bookingRepository = bookingRepository;
        this.monolithClient = monolithClient;
        this.eventProducer = eventProducer;
    }

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        String userId = request.getUserId();
        String hotelId = request.getHotelId();
        String promoCode = request.getPromoCode().isEmpty() ? null : request.getPromoCode();

        log.info("gRPC CreateBooking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);

        try {
            // Validate user
            if (!monolithClient.isUserActive(userId)) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                        .withDescription("User is inactive").asRuntimeException());
                return;
            }
            if (monolithClient.isUserBlacklisted(userId)) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                        .withDescription("User is blacklisted").asRuntimeException());
                return;
            }

            // Validate hotel
            if (!monolithClient.isHotelOperational(hotelId)) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                        .withDescription("Hotel is not operational").asRuntimeException());
                return;
            }
            if (!monolithClient.isHotelTrusted(hotelId)) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                        .withDescription("Hotel is not trusted based on reviews").asRuntimeException());
                return;
            }
            if (monolithClient.isHotelFullyBooked(hotelId)) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                        .withDescription("Hotel is fully booked").asRuntimeException());
                return;
            }

            // Resolve base price
            String status = monolithClient.getUserStatus(userId);
            double basePrice = "VIP".equalsIgnoreCase(status) ? 80.0 : 100.0;

            // Resolve promo discount
            double discount = monolithClient.getPromoDiscount(promoCode, userId);

            double finalPrice = basePrice - discount;

            // Save booking
            Booking booking = new Booking();
            booking.setUserId(userId);
            booking.setHotelId(hotelId);
            booking.setPromoCode(promoCode);
            booking.setDiscountPercent(discount);
            booking.setPrice(finalPrice);
            booking.setCreatedAt(Instant.now());
            Booking saved = bookingRepository.save(booking);

            String createdAtStr = saved.getCreatedAt().toString();

            // Publish Kafka event
            BookingCreatedEvent event = new BookingCreatedEvent(
                    String.valueOf(saved.getId()),
                    userId, hotelId,
                    promoCode != null ? promoCode : "",
                    discount, finalPrice, createdAtStr
            );
            eventProducer.publishBookingCreated(event);

            // Build response
            BookingResponse response = BookingResponse.newBuilder()
                    .setId(String.valueOf(saved.getId()))
                    .setUserId(userId)
                    .setHotelId(hotelId)
                    .setPromoCode(promoCode != null ? promoCode : "")
                    .setDiscountPercent(discount)
                    .setPrice(finalPrice)
                    .setCreatedAt(createdAtStr)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (io.grpc.StatusRuntimeException e) {
            responseObserver.onError(e);
        } catch (Exception e) {
            log.error("Unexpected error in createBooking: {}", e.getMessage(), e);
            responseObserver.onError(Status.INTERNAL
                    .withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        String userId = request.getUserId();
        log.info("gRPC ListBookings: userId={}", userId);

        List<Booking> bookings = bookingRepository.findByUserId(userId);
        BookingListResponse.Builder responseBuilder = BookingListResponse.newBuilder();

        for (Booking b : bookings) {
            BookingResponse br = BookingResponse.newBuilder()
                    .setId(String.valueOf(b.getId()))
                    .setUserId(b.getUserId())
                    .setHotelId(b.getHotelId())
                    .setPromoCode(b.getPromoCode() != null ? b.getPromoCode() : "")
                    .setDiscountPercent(b.getDiscountPercent() != null ? b.getDiscountPercent() : 0.0)
                    .setPrice(b.getPrice())
                    .setCreatedAt(b.getCreatedAt() != null ? b.getCreatedAt().toString() : "")
                    .build();
            responseBuilder.addBookings(br);
        }

        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }
}
