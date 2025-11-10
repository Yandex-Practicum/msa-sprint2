package com.hotelio.bookingservice.service;

import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.bookingservice.repository.BookingRepository;
import com.hotelio.proto.booking.*;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static com.hotelio.bookingservice.mapper.BookingMapper.toBookingEvent;
import static com.hotelio.bookingservice.mapper.BookingMapper.toBookingResponse;

@GrpcService
public class BookingGrpcService extends BookingServiceGrpc.BookingServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(BookingGrpcService.class);

    private static final String MONOLITH_BASE_URL = "http://monolith:8080";

    private final BookingRepository bookingRepository;
    private final BookingEventProducer bookingEventProducer;
    private final RestTemplate restTemplate = new RestTemplate();

    public BookingGrpcService(BookingRepository bookingRepository, BookingEventProducer bookingEventProducer) {
        this.bookingRepository = bookingRepository;
        this.bookingEventProducer = bookingEventProducer;
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        try {
            List<Booking> bookings = request.getUserId() != null ? bookingRepository.findByUserId(request.getUserId()) : bookingRepository.findAll();

            BookingListResponse.Builder responseBuilder = BookingListResponse.newBuilder();
            for (Booking booking : bookings) {
                BookingResponse bookingResponse = toBookingResponse(booking);
                responseBuilder.addBookings(bookingResponse);
            }

            responseObserver.onNext(responseBuilder.build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Error listing bookings: {}", e.getMessage());
            responseObserver.onError(new StatusRuntimeException(Status.INTERNAL.withDescription("Failed to list bookings: " + e.getMessage())));
        }
    }

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        String userId = request.getUserId();
        String hotelId = request.getHotelId();
        String promoCode = request.getPromoCode();

        log.info("Creating booking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);

        try {
            validateUser(userId);
            validateHotel(hotelId);

            double basePrice = resolveBasePrice(userId);
            double discount = resolvePromoDiscount(promoCode, userId);

            double finalPrice = basePrice - discount;
            log.info("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);

            Booking booking = new Booking();
            booking.setUserId(request.getUserId());
            booking.setHotelId(request.getHotelId());
            booking.setPromoCode(request.getPromoCode());
            booking.setCreatedAt(Instant.now());
            booking.setDiscountPercent(discount);
            booking.setPrice(finalPrice);

            booking = bookingRepository.save(booking);
            log.info("Booking saved with id: {}", booking.getId());

            bookingEventProducer.sendBookingCreatedEvent(toBookingEvent(booking));
            log.info("Booking created event sent for booking id: {}", booking.getId());

            BookingResponse response = toBookingResponse(booking);

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (StatusRuntimeException e) {
            log.error("gRPC error creating booking: {}", e.getStatus().getDescription());
            responseObserver.onError(e);
        } catch (Exception e) {
            log.error("Error creating booking: {}", e.getMessage());
            responseObserver.onError(new StatusRuntimeException(Status.INTERNAL.withDescription("Failed to create booking: " + e.getMessage())));
        }
    }

    private void validateUser(String userId) {
        String userUrl = MONOLITH_BASE_URL + "/api/users/" + userId;
        try {
            Boolean isActive = restTemplate.getForObject(userUrl + "/active", Boolean.class);
            if (isActive == null || !isActive) {
                log.warn("User {} is inactive", userId);
                throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("User is inactive"));
            }

            Boolean isBlacklisted = restTemplate.getForObject(userUrl + "/blacklisted", Boolean.class);
            if (isBlacklisted != null && isBlacklisted) {
                log.warn("User {} is blacklisted", userId);
                throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("User is blacklisted"));
            }
        } catch (StatusRuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error validating user {}: {}", userId, e.getMessage());
            throw new StatusRuntimeException(Status.INTERNAL.withDescription("User validation failed: " + e.getMessage()));
        }
    }

    private void validateHotel(String hotelId) {
        String hotelUrl = MONOLITH_BASE_URL + "/api/hotels/" + hotelId;
        try {
            Boolean isOperational = restTemplate.getForObject(hotelUrl + "/operational", Boolean.class);
            if (isOperational == null || !isOperational) {
                log.warn("Hotel {} is not operational", hotelId);
                throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("Hotel is not operational"));
            }

            Boolean isFullyBooked = restTemplate.getForObject(hotelUrl + "/fully-booked", Boolean.class);
            if (isFullyBooked != null && isFullyBooked) {
                log.warn("Hotel {} is fully booked", hotelId);
                throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("Hotel is fully booked"));
            }

            hotelUrl = MONOLITH_BASE_URL + "/api/reviews/hotel/" + hotelId;
            Boolean isTrusted = restTemplate.getForObject(hotelUrl + "/trusted", Boolean.class);
            if (isTrusted == null || !isTrusted) {
                log.warn("Hotel {} is not trusted", hotelId);
                throw new StatusRuntimeException(Status.INVALID_ARGUMENT.withDescription("Hotel is not trusted based on reviews"));
            }
        } catch (StatusRuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error validating hotel {}: {}", hotelId, e.getMessage());
            throw new StatusRuntimeException(Status.INTERNAL.withDescription("Hotel validation failed: " + e.getMessage()));
        }
    }

    private double resolveBasePrice(String userId) {
        String userUrl = MONOLITH_BASE_URL + "/api/users/" + userId;
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(userUrl + "/status", String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String status = response.getBody();
                boolean isVip = "VIP".equalsIgnoreCase(status);
                log.debug("User {} has status '{}', base price is {}", userId, status, isVip ? 80.0 : 100.0);
                return isVip ? 80.0 : 100.0;
            }

            log.debug("User {} has unknown status, default base price 100.0", userId);
            return 100.0;
        } catch (Exception e) {
            log.error("Error resolving base price for user {}: {}", userId, e.getMessage());
            return 100.0;
        }
    }

    private double resolvePromoDiscount(String promoCode, String userId) {
        if (promoCode == null || promoCode.isEmpty()) return 0.0;

        String promoUrl = MONOLITH_BASE_URL + "/api/promos/validate";
        try {
            String url = promoUrl + "?code={code}&userId={userId}";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class, promoCode, userId);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> promo = response.getBody();
                if (promo.containsKey("discount")) {
                    Double discount = (Double) promo.get("discount");
                    log.debug("Promo code '{}' applied with discount {}", promoCode, discount);
                    return discount != null ? discount : 0.0;
                }
            }
        } catch (Exception e) {
            log.info("Promo code '{}' is invalid or not applicable for user {}: {}", promoCode, userId, e.getMessage());
        }

        log.info("Promo code '{}' is invalid or not applicable for user {}", promoCode, userId);
        return 0.0;
    }
}