package com.hotelio.booking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MonolithClient {

    private static final Logger log = LoggerFactory.getLogger(MonolithClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public MonolithClient(@Value("${monolith.base-url:http://monolith:8080}") String baseUrl,
                          ObjectMapper objectMapper) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.objectMapper = objectMapper;
    }

    public boolean isUserActive(String userId) {
        return getBoolean("/api/users/{id}/active", userId);
    }

    public boolean isUserBlacklisted(String userId) {
        return getBoolean("/api/users/{id}/blacklisted", userId);
    }

    public boolean isHotelOperational(String hotelId) {
        return getBoolean("/api/hotels/{id}/operational", hotelId);
    }

    public boolean isHotelFullyBooked(String hotelId) {
        return getBoolean("/api/hotels/{id}/fully-booked", hotelId);
    }

    public boolean isTrustedHotel(String hotelId) {
        return getBoolean("/api/reviews/hotel/{id}/trusted", hotelId);
    }

    public String getUserStatus(String userId) {
        try {
            return restClient.get()
                    .uri("/api/users/{id}/status", userId)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("Cannot fetch status for user {}: {}", userId, e.getMessage());
            return "";
        }
    }

    public Double validatePromo(String code, String userId) {
        try {
            String body = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/promos/validate")
                            .queryParam("code", code)
                            .queryParam("userId", userId)
                            .build())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
            JsonNode node = objectMapper.readTree(body);
            JsonNode discount = node.get("discount");
            return discount == null ? 0.0 : discount.asDouble();
        } catch (Exception e) {
            log.info("Promo {} is invalid or not applicable for user {}: {}",
                    code, userId, e.getMessage());
            return null;
        }
    }

    private boolean getBoolean(String path, String id) {
        try {
            String body = restClient.get()
                    .uri(path, id)
                    .retrieve()
                    .body(String.class);
            return Boolean.parseBoolean(body);
        } catch (Exception e) {
            log.warn("Cannot reach monolith for {} {}: {}", path, id, e.getMessage());
            return false;
        }
    }
}