package com.hotelio.booking.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class MonolithRestClient {

    private static final Logger log = LoggerFactory.getLogger(MonolithRestClient.class);

    private final RestTemplate restTemplate;
    private final String monolithUrl;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MonolithRestClient(@Value("${monolith.url}") String monolithUrl) {
        this.restTemplate = new RestTemplate();
        this.monolithUrl = monolithUrl;
    }

    public boolean isUserActive(String userId) {
        String url = monolithUrl + "/api/users/" + userId + "/active";
        Boolean result = restTemplate.getForObject(url, Boolean.class);
        return Boolean.TRUE.equals(result);
    }

    public boolean isUserBlacklisted(String userId) {
        String url = monolithUrl + "/api/users/" + userId + "/blacklisted";
        Boolean result = restTemplate.getForObject(url, Boolean.class);
        return Boolean.TRUE.equals(result);
    }

    public String getUserStatus(String userId) {
        String url = monolithUrl + "/api/users/" + userId + "/status";
        return restTemplate.getForObject(url, String.class);
    }

    public boolean isHotelOperational(String hotelId) {
        String url = monolithUrl + "/api/hotels/" + hotelId + "/operational";
        Boolean result = restTemplate.getForObject(url, Boolean.class);
        return Boolean.TRUE.equals(result);
    }

    public boolean isHotelFullyBooked(String hotelId) {
        String url = monolithUrl + "/api/hotels/" + hotelId + "/fully-booked";
        Boolean result = restTemplate.getForObject(url, Boolean.class);
        return Boolean.TRUE.equals(result);
    }

    public boolean isHotelTrusted(String hotelId) {
        String url = monolithUrl + "/api/reviews/hotel/" + hotelId + "/trusted";
        Boolean result = restTemplate.getForObject(url, Boolean.class);
        return Boolean.TRUE.equals(result);
    }

    /**
     * Returns promo discount or 0.0 if not applicable.
     */
    public double getPromoDiscount(String promoCode, String userId) {
        if (promoCode == null || promoCode.isEmpty()) {
            return 0.0;
        }
        try {
            String url = monolithUrl + "/api/promos/validate?code=" + promoCode + "&userId=" + userId;
            String json = restTemplate.postForObject(url, null, String.class);
            if (json == null) return 0.0;
            JsonNode node = objectMapper.readTree(json);
            return node.path("discount").asDouble(0.0);
        } catch (Exception e) {
            log.info("Promo code '{}' not applicable for user {}: {}", promoCode, userId, e.getMessage());
            return 0.0;
        }
    }
}
