package com.hotelio.controller;

import com.hotelio.entity.BookingEntity;
import com.hotelio.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<BookingEntity>> getBookingsByUserId(@PathVariable String userId) {
       return ResponseEntity.ok(bookingService.listAll(userId));
    }
}
