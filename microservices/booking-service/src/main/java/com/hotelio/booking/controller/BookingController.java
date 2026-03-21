package com.hotelio.booking.controller;

import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
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
