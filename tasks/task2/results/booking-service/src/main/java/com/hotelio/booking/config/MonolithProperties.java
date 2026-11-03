package com.hotelio.booking.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "monolith")
public record MonolithProperties(
    String baseUrl,
    Duration timeout,
    CacheProperties users,
    CacheProperties hotels,
    CacheProperties fullyBooked,
    CacheProperties trustedHotels
) {

    public record CacheProperties(Duration ttl, Duration maxStale) {
    }
}
