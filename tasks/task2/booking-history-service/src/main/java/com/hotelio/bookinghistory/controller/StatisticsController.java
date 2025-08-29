package com.hotelio.bookinghistory.controller;

import com.hotelio.bookinghistory.entity.BookingEvent;
import com.hotelio.bookinghistory.repository.BookingEventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {
    
    private final BookingEventRepository repository;
    
    public StatisticsController(BookingEventRepository repository) {
        this.repository = repository;
    }
    
    @GetMapping("/events")
    public List<BookingEvent> getAllEvents() {
        return repository.findAll();
    }
    
    @GetMapping("/events/user/{userId}")
    public List<BookingEvent> getEventsByUser(@PathVariable String userId) {
        return repository.findByUserId(userId);
    }
    
    @GetMapping("/events/hotel/{hotelId}")
    public List<BookingEvent> getEventsByHotel(@PathVariable String hotelId) {
        return repository.findByHotelId(hotelId);
    }
    
    @GetMapping("/hotel/{hotelId}/summary")
    public ResponseEntity<Map<String, Object>> getHotelSummary(@PathVariable String hotelId) {
        try {
            long totalBookings = repository.countByHotelId(hotelId);
            Double avgPrice = repository.getAveragePriceByHotelId(hotelId);
            
            Map<String, Object> summary = new HashMap<>();
            summary.put("hotelId", hotelId);
            summary.put("totalBookings", totalBookings);
            summary.put("averagePrice", avgPrice != null ? avgPrice : 0.0);
            
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/user/{userId}/summary")
    public ResponseEntity<Map<String, Object>> getUserSummary(@PathVariable String userId) {
        try {
            long totalBookings = repository.countByUserId(userId);
            List<BookingEvent> userEvents = repository.findByUserId(userId);
            
            Map<String, Object> summary = new HashMap<>();
            summary.put("userId", userId);
            summary.put("totalBookings", totalBookings);
            summary.put("events", userEvents);
            
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
