package com.hotelio.booking.service;

import com.hotelio.booking.dto.PromoCodeDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PromoCodeService {

    private final RestTemplate restTemplate;
    @Value("${monolith.base-url}")
    private String monolithUrl;

    public PromoCodeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public PromoCodeDto validatePromo(String code, String userId) {
        String url = UriComponentsBuilder.fromHttpUrl(monolithUrl + "/api/promos/validate")
                .queryParam("code", code)
                .queryParam("userId", userId)
                .build()
                .toUriString();

        return restTemplate.exchange(
                url,
                HttpMethod.POST,
                null,
                PromoCodeDto.class
        ).getBody();
    }
}
