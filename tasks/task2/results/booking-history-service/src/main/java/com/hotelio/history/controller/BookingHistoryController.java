package com.hotelio.history.controller;

import com.hotelio.history.dto.BookingHistoryResponse;
import com.hotelio.history.dto.BookingStatsResponse;
import com.hotelio.history.service.BookingHistoryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BookingHistoryController {

    private final BookingHistoryService bookingHistoryService;

    @GetMapping("/history")
    public List<BookingHistoryResponse> getHistory(@RequestParam(required = false) String userId) {
        return bookingHistoryService.findHistory(userId);
    }

    @GetMapping("/stats/users")
    public List<BookingStatsResponse> getStatsByUser() {
        return bookingHistoryService.statsByUser();
    }

    @GetMapping("/stats/hotels")
    public List<BookingStatsResponse> getStatsByHotel() {
        return bookingHistoryService.statsByHotel();
    }

    @GetMapping("/stats/days")
    public List<BookingStatsResponse> getStatsByDay() {
        return bookingHistoryService.statsByDay();
    }

    @GetMapping("/stats/cities")
    public List<BookingStatsResponse> getStatsByCity() {
        return bookingHistoryService.statsByCity();
    }
}
