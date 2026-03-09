package com.hotelio.booking.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class HotelService {

    private final RestTemplate restTemplate;
    @Value("${monolith.base-url}")
    private String monolithUrl;

    public HotelService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean isHotelOperational(String id) {
        String url = monolithUrl + "/api/hotels/{id}/operational";
        return restTemplate.getForObject(url, Boolean.class, id);
    }

    public boolean isHotelFullyBooked(String id) {
        String url = monolithUrl + "/api/hotels/{id}/fully-booked";
        return restTemplate.getForObject(url, Boolean.class, id);
    }
}
