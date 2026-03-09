package com.hotelio.booking.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

@Service
public class AppUserService {
    private final RestTemplate restTemplate;
    @Value("${monolith.base-url}")
    private String monolithUrl;

    public AppUserService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Optional<String> getUserStatus(String userId) {
        String url = monolithUrl + "/api/users/{userId}/status";
        String response = restTemplate.exchange(url, HttpMethod.GET, null, String.class, userId).getBody();
        return Optional.ofNullable(response);
    }

    public boolean isUserBlacklisted(String userId) {
        String url = monolithUrl + "/api/users/{userId}/blacklisted";
        return restTemplate.getForObject(url, Boolean.class, userId);
    }

    public boolean isUserActive(String userId) {
        String url = monolithUrl + "/api/users/{userId}/active";
        return restTemplate.getForObject(url, Boolean.class, userId);
    }
}
