package com.hotelio.booking;

import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingListResponse;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Component
public class BookingGrpcService extends BookingServiceGrpc.BookingServiceImplBase {

    private final BookingRepository repository;
    private final MonolithClient monolithClient;
    private final KafkaTemplate<String, BookingCreatedEvent> kafkaTemplate;

    @Value("${app.kafka.topic}")
    private String topic;

    public BookingGrpcService(
            BookingRepository repository,
            MonolithClient monolithClient,
            KafkaTemplate<String, BookingCreatedEvent> kafkaTemplate
    ) {
        this.repository = repository;
        this.monolithClient = monolithClient;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        try {
            Map<String, Object> user = monolithClient.getUser(request.getUserId());
            if (user == null) {
                throw new IllegalArgumentException("User not found");
            }

            Boolean active = (Boolean) user.get("active");
            Boolean blacklisted = (Boolean) user.get("blacklisted");

            if (!Boolean.TRUE.equals(active) || Boolean.TRUE.equals(blacklisted)) {
                throw new IllegalArgumentException("User is not allowed");
            }

            Map<String, Object> hotel = monolithClient.getHotel(request.getHotelId());
            if (hotel == null) {
                throw new IllegalArgumentException("Hotel not found");
            }

            Boolean operational = (Boolean) hotel.get("operational");
            Boolean fullyBooked = (Boolean) hotel.get("fullyBooked");

            if (!Boolean.TRUE.equals(operational)) {
                throw new IllegalArgumentException("Hotel is not operational");
            }

            if (Boolean.TRUE.equals(fullyBooked)) {
                throw new IllegalArgumentException("Hotel is fully booked");
            }

            double basePrice = 100.0;
            Object ratingObj = hotel.get("rating");
            if (ratingObj instanceof Number) {
                basePrice = ((Number) ratingObj).doubleValue() * 100.0;
            }

            double discountPercent = 0.0;
            String promoCode = request.getPromoCode() == null ? "" : request.getPromoCode();

            if (!promoCode.isBlank()) {
                Map<String, Object> promo = monolithClient.validatePromo(promoCode, request.getUserId());

                if (promo == null) {
                    throw new IllegalArgumentException("Promo not found");
                }

                Object discountObj = promo.get("discount");
                if (discountObj == null) {
                    throw new IllegalArgumentException("Promo discount is missing");
                }

                discountPercent = ((Number) discountObj).doubleValue();
            }

            double finalPrice = basePrice - (basePrice * discountPercent / 100.0);
            String createdAt = OffsetDateTime.now().toString();

            BookingEntity entity = new BookingEntity(
                    request.getUserId(),
                    request.getHotelId(),
                    promoCode,
                    discountPercent,
                    finalPrice,
                    createdAt
            );

            entity = repository.save(entity);

            BookingCreatedEvent event = new BookingCreatedEvent(
                    String.valueOf(entity.getId()),
                    entity.getUserId(),
                    entity.getHotelId(),
                    entity.getPromoCode(),
                    entity.getDiscountPercent(),
                    entity.getPrice(),
                    entity.getCreatedAt()
            );

            kafkaTemplate.send(topic, String.valueOf(entity.getId()), event);

            BookingResponse response = BookingResponse.newBuilder()
                    .setId(String.valueOf(entity.getId()))
                    .setUserId(entity.getUserId())
                    .setHotelId(entity.getHotelId())
                    .setPromoCode(entity.getPromoCode() == null ? "" : entity.getPromoCode())
                    .setDiscountPercent(entity.getDiscountPercent())
                    .setPrice(entity.getPrice())
                    .setCreatedAt(entity.getCreatedAt())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            responseObserver.onError(
                    Status.INVALID_ARGUMENT
                            .withDescription(e.getMessage())
                            .asRuntimeException()
            );
        } catch (Exception e) {
            e.printStackTrace();
            responseObserver.onError(
                    Status.INTERNAL
                            .withDescription("Create booking failed: " + e.getMessage())
                            .asRuntimeException()
            );
        }
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        try {
            List<BookingEntity> list;

            if (request.getUserId().isBlank()) {
                list = repository.findAllByOrderByCreatedAtDesc();
            } else {
                list = repository.findByUserIdOrderByCreatedAtDesc(request.getUserId());
            }

            BookingListResponse.Builder builder = BookingListResponse.newBuilder();

            for (BookingEntity e : list) {
                builder.addBookings(
                        BookingResponse.newBuilder()
                                .setId(String.valueOf(e.getId()))
                                .setUserId(e.getUserId())
                                .setHotelId(e.getHotelId())
                                .setPromoCode(e.getPromoCode() == null ? "" : e.getPromoCode())
                                .setDiscountPercent(e.getDiscountPercent())
                                .setPrice(e.getPrice())
                                .setCreatedAt(e.getCreatedAt())
                                .build()
                );
            }

            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();

        } catch (Exception e) {
            e.printStackTrace();
            responseObserver.onError(
                    Status.INTERNAL
                            .withDescription("List bookings failed: " + e.getMessage())
                            .asRuntimeException()
            );
        }
    }
}