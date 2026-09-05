package com.hotelio.bookingservice.controller;

import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.bookingservice.service.BookingService;
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

    // GET /api/bookings?id=123
    @GetMapping("/{id}")
    public ResponseEntity<Booking> getById(@PathVariable String id) {
        return bookingService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
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
