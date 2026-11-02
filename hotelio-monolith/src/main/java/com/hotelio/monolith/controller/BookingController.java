package com.hotelio.monolith.controller;

import com.google.protobuf.InvalidProtocolBufferException;
import com.hotelio.monolith.client.BookingGrpcClient;
import com.hotelio.monolith.entity.Booking;
import com.hotelio.monolith.service.BookingService;
import com.hotelio.proto.booking.BookingResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.google.protobuf.util.JsonFormat;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final Logger logger = LoggerFactory.getLogger(BookingController.class);

    private final BookingGrpcClient grpcClient;
    private final BookingService bookingService;

    public BookingController(BookingGrpcClient grpcClient, BookingService bookingService) {
        this.grpcClient = grpcClient;
        this.bookingService = bookingService;
    }

    // GET /api/bookings?userId=123
    @GetMapping
    public List<Booking> listBookings(@RequestParam(required = false) String userId) {
        return bookingService.listAll(userId);
    }

    // POST /api/bookings
    @PostMapping
    public ResponseEntity<String> createBooking(@RequestParam String userId,
                                                @RequestParam String hotelId,
                                                @RequestParam(required = false) String promoCode) throws InvalidProtocolBufferException {
        logger.info("МОНОЛИТ: Запрос на бронирование");

        BookingResponse bookingResponse = grpcClient.createBooking(userId, hotelId, promoCode);
        String json = JsonFormat.printer().print(bookingResponse);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(json);
    }
}
