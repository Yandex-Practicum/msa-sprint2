package com.hotelio.booking.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;


@Service
public class ReviewService {


    private final RestTemplate restTemplate;
    @Value("${monolith.base-url}")
    private String monolithUrl;

    public ReviewService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean isTrustedHotel(String hotelId) {
        String url = monolithUrl + "/api/reviews/hotel/{hotelId}/trusted";
        return restTemplate.getForObject(url, Boolean.class, hotelId);
    }
}
