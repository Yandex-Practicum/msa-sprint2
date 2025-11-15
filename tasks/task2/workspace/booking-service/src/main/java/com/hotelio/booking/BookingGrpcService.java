package com.hotelio.booking;

import com.hotelio.proto.booking.BookingListRequest;
import com.hotelio.proto.booking.BookingListResponse;
import com.hotelio.proto.booking.BookingRequest;
import com.hotelio.proto.booking.BookingResponse;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import io.grpc.Status;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.format.DateTimeFormatter;

@GrpcService
public class BookingGrpcService extends BookingServiceGrpc.BookingServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(BookingGrpcService.class);

    private final BookingRepository repo;
    private final KafkaTemplate<String, String> kafka;
    private final String topic;
    private final ObjectMapper objectMapper;

    public BookingGrpcService(BookingRepository repo,
                              KafkaTemplate<String, String> kafka,
                              @Value("${booking.topic}") String topic,
                              ObjectMapper objectMapper) {
        this.repo = repo;
        this.kafka = kafka;
        this.topic = topic;
        this.objectMapper = objectMapper;
    }

    private BookingResponse toProto(BookingEntity e) {
        return BookingResponse.newBuilder()
                .setId(String.valueOf(e.getId()))
                .setUserId(e.getUserId())
                .setHotelId(e.getHotelId())
                .setPromoCode(e.getPromoCode() == null ? "" : e.getPromoCode())
                .setDiscountPercent(e.getDiscountPercent())
                .setPrice(e.getPrice())
                .setCreatedAt(e.getCreatedAt().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                .build();
    }

    private Map<String, Object> buildEvent(BookingEntity e) {
        Map<String, Object> evt = new HashMap<>();
        evt.put("id", e.getId());
        evt.put("userId", e.getUserId());
        evt.put("hotelId", e.getHotelId());
        evt.put("promoCode", e.getPromoCode() == null ? "" : e.getPromoCode());
        evt.put("discountPercent", e.getDiscountPercent());
        evt.put("price", e.getPrice());
        return evt;
    }

    @Override
    @Transactional
    public void createBooking(BookingRequest request, StreamObserver<BookingResponse> responseObserver) {
        try {
            BookingEntity e = new BookingEntity();
            e.setUserId(request.getUserId());
            e.setHotelId(request.getHotelId());

            String promo = request.getPromoCode();
            if (promo == null || promo.isBlank()) promo = null;
            e.setPromoCode(promo);
            e.setDiscountPercent(promo == null ? 0 : 10);

            e = repo.save(e);

            Map<String,Object> evt = buildEvent(e);
            String payload = objectMapper.writeValueAsString(evt);
            kafka.send(new ProducerRecord<>(topic, e.getUserId(), payload));

            responseObserver.onNext(toProto(e));
            responseObserver.onCompleted();
        } catch (Exception ex) {
            log.error("CreateBooking failed, req={}", request, ex);
            responseObserver.onError(
                    Status.INTERNAL.withDescription(ex.getMessage()).asRuntimeException()
            );
        }
    }

    @Override
    public void listBookings(BookingListRequest request, StreamObserver<BookingListResponse> responseObserver) {
        var list = repo.findByUserIdOrderByCreatedAtDesc(request.getUserId()).stream()
                .map(this::toProto)
                .toList();
        var resp = BookingListResponse.newBuilder().addAllBookings(list).build();
        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }
}
