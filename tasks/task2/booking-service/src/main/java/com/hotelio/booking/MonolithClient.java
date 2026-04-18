package com.hotelio.booking;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class MonolithClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.monolith.base-url}")
    private String baseUrl;

    public Map getUser(String userId) {
        return restTemplate.getForObject(baseUrl + "/api/users/" + userId, Map.class);
    }

    public Map getHotel(String hotelId) {
        return restTemplate.getForObject(baseUrl + "/api/hotels/" + hotelId, Map.class);
    }

    public Boolean isTrusted(String hotelId) {
        ResponseEntity<Boolean> response =
                restTemplate.getForEntity(baseUrl + "/api/reviews/hotel/" + hotelId + "/trusted", Boolean.class);
        return response.getBody();
    }

    public Map validatePromo(String code, String userId) {
        return restTemplate.postForObject(
                baseUrl + "/api/promos/validate?code=" + code + "&userId=" + userId,
                null,
                Map.class
        );
    }
}