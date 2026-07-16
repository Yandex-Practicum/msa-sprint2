package com.hotelio.bookingservice.service;

import com.hotelio.bookingservice.client.MonolithHotelServiceClient;
import com.hotelio.bookingservice.client.MonolithPromoCodeServiceClient;
import com.hotelio.bookingservice.client.MonolithReviewServiceClient;
import com.hotelio.bookingservice.client.MonolithUserServiceClient;
import com.hotelio.bookingservice.dto.PromoCode;
import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.core.middleware.BookingCreatedEvent;
import com.hotelio.bookingservice.mapper.BookingMapper;
import com.hotelio.bookingservice.repository.BookingRepository;
import com.hotelio.proto.booking.*;
import io.grpc.stub.StreamObserver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.grpc.server.service.GrpcService;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@GrpcService
public class BookingService extends BookingServiceGrpc.BookingServiceImplBase {

    @Value("${app.kafka.topics.booking-history.name}")
    private String bookingHistoryTopicName;

    private final BookingRepository bookingRepository;

    private final MonolithUserServiceClient userServiceClient;

    private final MonolithHotelServiceClient hotelServiceClient;

    private final MonolithReviewServiceClient reviewServiceClient;

    private final MonolithPromoCodeServiceClient promoCodeServiceClient;

    private final BookingMapper bookingMapper;

    private final KafkaTemplate<String, BookingCreatedEvent> kafkaTemplate;

    @Autowired
    public BookingService(BookingRepository bookingRepository,
                          MonolithUserServiceClient userServiceClient,
                          MonolithHotelServiceClient hotelServiceClient,
                          MonolithReviewServiceClient reviewServiceClient,
                          MonolithPromoCodeServiceClient promoCodeServiceClient,
                          BookingMapper bookingMapper,
                          KafkaTemplate<String, BookingCreatedEvent> kafkaTemplate) {
        this.bookingRepository = bookingRepository;
        this.userServiceClient = userServiceClient;
        this.hotelServiceClient = hotelServiceClient;
        this.reviewServiceClient = reviewServiceClient;
        this.promoCodeServiceClient = promoCodeServiceClient;
        this.bookingMapper = bookingMapper;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        try {
            List<Booking> bookings;

            if (request.getUserId().equals("default")) {
                bookings = bookingRepository.findAll();
            } else {
                bookings = bookingRepository.findByUserId(request.getUserId());
            }

            List<BookingResponse> bookingResponses = bookings.stream()
                    .map(bookingMapper::pojoToProto)
                    .toList();
            BookingListResponse response = BookingListResponse.newBuilder()
                    .addAllBookings(bookingResponses)
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("Unexpected error during booking creation", e);
            responseObserver.onError(
                    io.grpc.Status.INTERNAL
                            .withDescription(e.getMessage())
                            .withCause(e)
                            .asRuntimeException()
            );
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {

        try {
            String userId = request.getUserId();
            String hotelId = request.getHotelId();
            String promoCode = request.getPromoCode();

            validateUser(userId);
            validateHotel(hotelId);

            double basePrice = resolveBasePrice(userId);
            double discount = resolvePromoDiscount(promoCode, userId);

            double finalPrice = basePrice - discount;
            log.info("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);

            Booking booking = new Booking();
            booking.setUserId(userId);
            booking.setHotelId(hotelId);
            booking.setPromoCode(promoCode);
            booking.setDiscountPercent(discount);
            booking.setPrice(finalPrice);

            Booking savedBooking = bookingRepository.save(booking);

            log.info("Preparing to send booking in Kafka: bookingId = {}",savedBooking.getId());
            BookingCreatedEvent bookingCreatedEvent = bookingMapper.pojoToEvent(savedBooking);
            kafkaTemplate.send(bookingHistoryTopicName, String.valueOf(savedBooking.getId()), bookingCreatedEvent);

            BookingResponse bookingResponse = bookingMapper.pojoToProto(savedBooking);

            responseObserver.onNext(bookingResponse);
            responseObserver.onCompleted();
        } catch (IllegalArgumentException e) {
            log.warn("Booking validation failed: {}", e.getMessage());
            responseObserver.onError(
                    io.grpc.Status.INVALID_ARGUMENT
                            .withDescription(e.getMessage())
                            .asRuntimeException()
            );
        } catch (Exception e) {
            log.error("Unexpected error during booking creation", e);
            responseObserver.onError(
                    io.grpc.Status.INTERNAL
                            .withDescription(e.getMessage())
                            .withCause(e)
                            .asRuntimeException()
            );
        }
    }

    private void validateUser(String userId) {
        if (!userServiceClient.isUserActive(userId)) {
            log.warn("User {} is inactive", userId);
            throw new IllegalArgumentException("User is inactive");
        }
        if (userServiceClient.isUserBlacklisted(userId)) {
            log.warn("User {} is blacklisted", userId);
            throw new IllegalArgumentException("User is blacklisted");
        }
    }

    private void validateHotel(String hotelId) {
        if (!hotelServiceClient.isHotelOperational(hotelId)) {
            log.warn("Hotel {} is not operational", hotelId);
            throw new IllegalArgumentException("Hotel is not operational");
        }
        if (!reviewServiceClient.isTrustedHotel(hotelId)) {
            log.warn("Hotel {} is not trusted", hotelId);
            throw new IllegalArgumentException("Hotel is not trusted based on reviews");
        }
        if (hotelServiceClient.isHotelFullyBooked(hotelId)) {
            log.warn("Hotel {} is fully booked", hotelId);
            throw new IllegalArgumentException("Hotel is fully booked");
        }
    }

    private double resolveBasePrice(String userId) {
        Optional<String> statusOpt = Optional.of(userServiceClient.getUserStatus(userId).toString());
        return statusOpt.map(status -> {
            boolean isVip = status.equalsIgnoreCase("VIP");
            log.debug("User {} has status '{}', base price is {}", userId, status, isVip ? 80.0 : 100.0);
            return isVip ? 80.0 : 100.0;
        }).orElseGet(() -> {
            log.debug("User {} has unknown status, default base price 100.0", userId);
            return 100.0;
        });
    }

    private double resolvePromoDiscount(String promoCode, String userId) {
        if (promoCode == null || promoCode.isBlank()) return 0.0;

        PromoCode promo = promoCodeServiceClient.validate(promoCode, userId);
        if (promo == null) {
            log.info("Promo code '{}' is invalid or not applicable for user {}", promoCode, userId);
            return 0.0;
        }

        log.debug("Promo code '{}' applied with discount {}", promoCode, promo.getDiscount());
        return promo.getDiscount();
    }
}

