package com.hotelio.history.controller;

import com.hotelio.history.service.StatisticsService;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping
    public Map<String, Object> summary() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBookings", statisticsService.totalBookings());
        result.put("byUser", statisticsService.countByUser());
        result.put("byHotel", statisticsService.countByHotel());
        result.put("byDay", statisticsService.countByDay());
        result.put("avgPrice", statisticsService.avgPrice());
        return result;
    }

    @GetMapping("/by-user")
    public Map<String, Long> byUser() {
        return statisticsService.countByUser();
    }

    @GetMapping("/by-hotel")
    public Map<String, Long> byHotel() {
        return statisticsService.countByHotel();
    }

    @GetMapping("/by-day")
    public Map<String, Long> byDay() {
        return statisticsService.countByDay();
    }
}