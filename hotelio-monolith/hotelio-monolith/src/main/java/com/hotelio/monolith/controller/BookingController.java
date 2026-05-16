package com.hotelio.monolith.controller;

import com.hotelio.monolith.entity.Booking;
import com.hotelio.monolith.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    // GET /api/bookings?userId=123
    @GetMapping
    public List<Booking> listBookings(@RequestParam(required = false) String userId) {
        return bookingService.listAll(userId);
    }

    // POST /api/bookings
    @PostMapping
    public ResponseEntity<Booking> createBooking(@RequestParam String userId,
                                                 @RequestParam String hotelId,
                                                 @RequestParam(required = false) String promoCode) {
        Booking booking = bookingService.createBooking(userId, hotelId, promoCode);
        return ResponseEntity.ok(booking);
    }
}
