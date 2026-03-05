package com.hotelio.history.controller;

import com.hotelio.history.entity.BookingHistory;
import com.hotelio.history.repository.BookingHistoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final BookingHistoryRepository repository;

    public HistoryController(BookingHistoryRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingHistory>> getAllBookings() {
        return ResponseEntity.ok(repository.findAll());
    }
}
