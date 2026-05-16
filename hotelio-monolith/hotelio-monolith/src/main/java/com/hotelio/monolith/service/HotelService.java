package com.hotelio.monolith.service;

import com.hotelio.monolith.entity.Hotel;
import com.hotelio.monolith.repository.HotelRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class HotelService {

    private final HotelRepository repo;

    public HotelService(HotelRepository repo) {
        this.repo = repo;
    }

    public boolean isHotelOperational(String hotelId) {
        return repo.findById(hotelId).map(Hotel::isOperational).orElse(false);
    }

    public boolean isHotelFullyBooked(String hotelId) {
        return repo.findById(hotelId).map(Hotel::isFullyBooked).orElse(true);
    }

    public Optional<Hotel> getHotelById(String hotelId) {
        return repo.findById(hotelId);
    }

    public List<Hotel> findHotelsInCity(String city) {
        if (city == null || city.isBlank()) return Collections.emptyList();
        return repo.findByCity(city);
    }

    public List<Hotel> findTopRatedHotelsInCity(String city, int limit) {
        if (city == null || city.isBlank()) return Collections.emptyList();
        return repo.findByCityOrderByRatingDesc(city).stream()
                .limit(limit)
                .toList();
    }
}
