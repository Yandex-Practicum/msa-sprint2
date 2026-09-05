package com.hotelio.bookingservice.connectors;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelio.bookingservice.entity.PromoCode;
import org.springframework.stereotype.Service;

@Service
public class PromoCodeServiceProxy {
    private final RestConnectionProxy restConnectionProxy;
    private final ObjectMapper objectMapper;

    public PromoCodeServiceProxy(RestConnectionProxy restConnectionProxy, ObjectMapper objectMapper) {
        this.restConnectionProxy = restConnectionProxy;
        this.objectMapper = objectMapper;
    }

    public PromoCode validate(String promoCode, String userId) {
        String url = "/promos/validate" + "?code=" + promoCode + "&userId=" + userId;
        String result = restConnectionProxy.PostAndGetStringValue(url, null);
        try {
            return objectMapper.readValue(result, PromoCode.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse promo code response: " + result, e);
        }        
    }
}
