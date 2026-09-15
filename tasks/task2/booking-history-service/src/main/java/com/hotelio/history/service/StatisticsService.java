package com.hotelio.history.service;

import com.hotelio.history.entity.BookingHistory;
import com.hotelio.history.repository.BookingHistoryRepository;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatisticsService {

    private final BookingHistoryRepository repository;

    public StatisticsService(BookingHistoryRepository repository) {
        this.repository = repository;
    }

    public long totalBookings() {
        return repository.count();
    }

    public Map<String, Long> countByUser() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (BookingHistory h : all()) {
            result.merge(h.getUserId(), 1L, (a, b) -> a + b);
        }
        return result;
    }

    public Map<String, Long> countByHotel() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (BookingHistory h : all()) {
            result.merge(h.getHotelId(), 1L, (a, b) -> a + b);
        }
        return result;
    }

    public Map<String, Long> countByDay() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (BookingHistory h : all()) {
            String day = h.getBookingCreatedAt().atOffset(ZoneOffset.UTC).toLocalDate().toString();
            result.merge(day, 1L, (a, b) -> a + b);
        }
        return result;
    }

    public double avgPrice() {
        List<BookingHistory> all = all();
        return all.isEmpty() ? 0.0 : all.stream().mapToDouble(BookingHistory::getPrice).average().orElse(0.0);
    }

    private List<BookingHistory> all() {
        return repository.findAll();
    }
}