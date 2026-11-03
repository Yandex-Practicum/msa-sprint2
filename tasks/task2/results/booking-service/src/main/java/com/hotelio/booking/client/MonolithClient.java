package com.hotelio.booking.client;

import com.hotelio.booking.client.dto.HotelResponse;
import com.hotelio.booking.client.dto.PromoCodeResponse;
import com.hotelio.booking.client.dto.UserResponse;
import com.hotelio.booking.exception.MonolithUnavailableException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.retry.Retry;
import java.util.Optional;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * REST-вызовы монолита с таймаутом, повтором и circuit breaker. Кэш — уровнем выше, в {@code MonolithDataProvider}.
 */
@Component
@RequiredArgsConstructor
public class MonolithClient {

    private static final String USER_PATH = "/api/users/{id}";
    private static final String HOTEL_PATH = "/api/hotels/{id}";
    private static final String HOTEL_FULLY_BOOKED_PATH = "/api/hotels/{id}/fully-booked";
    private static final String HOTEL_TRUSTED_PATH = "/api/reviews/hotel/{id}/trusted";
    private static final String PROMO_VALIDATE_PATH = "/api/promos/validate";

    private final RestClient monolithRestClient;
    private final Retry monolithRetry;
    private final CircuitBreaker monolithCircuitBreaker;

    public Optional<UserResponse> findUser(String userId) {
        return call(() -> getOrEmpty(USER_PATH, UserResponse.class, userId));
    }

    public Optional<HotelResponse> findHotel(String hotelId) {
        return call(() -> getOrEmpty(HOTEL_PATH, HotelResponse.class, hotelId));
    }

    public boolean isHotelFullyBooked(String hotelId) {
        return call(() -> Boolean.TRUE.equals(get(HOTEL_FULLY_BOOKED_PATH, hotelId)));
    }

    public boolean isHotelTrusted(String hotelId) {
        return call(() -> Boolean.TRUE.equals(get(HOTEL_TRUSTED_PATH, hotelId)));
    }

    public Optional<PromoCodeResponse> validatePromoCode(String code, String userId) {
        return call(() -> validate(code, userId));
    }

    private <T> Optional<T> getOrEmpty(String path, Class<T> type, String id) {
        try {
            var body = monolithRestClient.get()
                .uri(path, id)
                .retrieve()
                .body(type);

            return Optional.ofNullable(body);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private Boolean get(String path, String id) {
        return monolithRestClient.get()
            .uri(path, id)
            .retrieve()
            .body(Boolean.class);
    }

    // Монолит отвечает 400, если промокод не найден, истёк или недоступен пользователю.
    private Optional<PromoCodeResponse> validate(String code, String userId) {
        try {
            var body = monolithRestClient.post()
                .uri(uriBuilder -> uriBuilder.path(PROMO_VALIDATE_PATH).queryParam("code", code).queryParam("userId", userId).build())
                .retrieve()
                .body(PromoCodeResponse.class);

            return Optional.ofNullable(body);
        } catch (HttpClientErrorException.BadRequest e) {
            return Optional.empty();
        }
    }

    private <T> T call(Supplier<T> request) {
        var protectedRequest = CircuitBreaker.decorateSupplier(monolithCircuitBreaker, Retry.decorateSupplier(monolithRetry, request));

        try {
            return protectedRequest.get();
        } catch (CallNotPermittedException | RestClientException e) {
            throw new MonolithUnavailableException(e);
        }
    }
}
