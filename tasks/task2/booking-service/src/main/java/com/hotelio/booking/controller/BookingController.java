package com.hotelio.booking.controller;

import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.service.BookingBusinessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    
    private final BookingBusinessService bookingBusinessService;
    
    public BookingController(BookingBusinessService bookingBusinessService) {
        this.bookingBusinessService = bookingBusinessService;
    }
    
    @GetMapping
    public List<Booking> listBookings(@RequestParam(required = false) String userId) {
        return bookingBusinessService.listAll(userId);
    }
    
    @PostMapping
    public ResponseEntity<Booking> createBooking(@RequestParam String userId,
                                               @RequestParam String hotelId,
                                               @RequestParam(required = false) String promoCode) {
        try {
            Booking booking = bookingBusinessService.createBooking(userId, hotelId, promoCode);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
