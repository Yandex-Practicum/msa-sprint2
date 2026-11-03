package com.hotelio.booking.client;

import com.hotelio.booking.cache.TtlCache;
import com.hotelio.booking.client.dto.HotelResponse;
import com.hotelio.booking.client.dto.PromoCodeResponse;
import com.hotelio.booking.client.dto.UserResponse;
import com.hotelio.booking.config.MonolithProperties;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Данные монолита для проверок бронирования. Справочные данные читаются из кэша, промокод — всегда из монолита:
 * ответ зависит от пары «промокод + пользователь» и влияет на цену.
 */
@Component
public class MonolithDataProvider {

    private final MonolithClient monolithClient;
    private final TtlCache<String, Optional<UserResponse>> users;
    private final TtlCache<String, Optional<HotelResponse>> hotels;
    private final TtlCache<String, Boolean> fullyBookedHotels;
    private final TtlCache<String, Boolean> trustedHotels;

    public MonolithDataProvider(
        MonolithClient monolithClient,
        MonolithProperties properties,
        Clock clock,
        MeterRegistry meterRegistry
    ) {
        this.monolithClient = monolithClient;
        this.users = createCache("users", properties.users(), clock, meterRegistry);
        this.hotels = createCache("hotels", properties.hotels(), clock, meterRegistry);
        this.fullyBookedHotels = createCache("fully-booked", properties.fullyBooked(), clock, meterRegistry);
        this.trustedHotels = createCache("trusted-hotels", properties.trustedHotels(), clock, meterRegistry);
    }

    public Optional<UserResponse> findUser(String userId) {
        return users.get(userId, monolithClient::findUser);
    }

    public Optional<HotelResponse> findHotel(String hotelId) {
        return hotels.get(hotelId, monolithClient::findHotel);
    }

    public boolean isHotelFullyBooked(String hotelId) {
        return fullyBookedHotels.get(hotelId, monolithClient::isHotelFullyBooked);
    }

    public boolean isHotelTrusted(String hotelId) {
        return trustedHotels.get(hotelId, monolithClient::isHotelTrusted);
    }

    public Optional<PromoCodeResponse> validatePromoCode(String code, String userId) {
        return monolithClient.validatePromoCode(code, userId);
    }

    private static <V> TtlCache<String, V> createCache(
        String name,
        MonolithProperties.CacheProperties cacheProperties,
        Clock clock,
        MeterRegistry meterRegistry
    ) {
        return new TtlCache<>(
            name,
            cacheProperties.ttl(),
            cacheProperties.maxStale(),
            clock,
            meterRegistry
        );
    }
}
