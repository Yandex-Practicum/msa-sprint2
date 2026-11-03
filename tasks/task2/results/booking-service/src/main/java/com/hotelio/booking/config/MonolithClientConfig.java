package com.hotelio.booking.config;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.core.IntervalFunction;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import java.net.ConnectException;
import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

@Configuration
public class MonolithClientConfig {

    private static final String MONOLITH = "monolith";
    private static final int MAX_ATTEMPTS = 2;
    private static final long RETRY_INTERVAL_MILLIS = 200;
    private static final double RETRY_RANDOMIZATION_FACTOR = 0.5;
    private static final int CIRCUIT_BREAKER_WINDOW_SIZE = 20;
    private static final int CIRCUIT_BREAKER_MIN_CALLS = 10;
    private static final float CIRCUIT_BREAKER_FAILURE_RATE = 50;
    private static final Duration CIRCUIT_BREAKER_OPEN_DURATION = Duration.ofSeconds(10);
    private static final int MONOLITH_THREADS = 32;

    @Bean
    public RestClient monolithRestClient(MonolithProperties properties) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.timeout());
        requestFactory.setReadTimeout(properties.timeout());

        return RestClient.builder()
            .baseUrl(properties.baseUrl())
            .requestFactory(requestFactory)
            .build();
    }

    @Bean
    public Retry monolithRetry() {
        var config = RetryConfig.custom()
            .maxAttempts(MAX_ATTEMPTS)
            .intervalFunction(IntervalFunction.ofRandomized(RETRY_INTERVAL_MILLIS, RETRY_RANDOMIZATION_FACTOR))
            .retryOnException(MonolithClientConfig::isFastFailure)
            .build();

        return Retry.of(MONOLITH, config);
    }

    @Bean
    public CircuitBreaker monolithCircuitBreaker() {
        var config = CircuitBreakerConfig.custom()
            .slidingWindowSize(CIRCUIT_BREAKER_WINDOW_SIZE)
            .minimumNumberOfCalls(CIRCUIT_BREAKER_MIN_CALLS)
            .failureRateThreshold(CIRCUIT_BREAKER_FAILURE_RATE)
            .waitDurationInOpenState(CIRCUIT_BREAKER_OPEN_DURATION)
            .build();

        return CircuitBreaker.of(MONOLITH, config);
    }

    @Bean(destroyMethod = "shutdown")
    public ExecutorService monolithExecutor() {
        return Executors.newFixedThreadPool(MONOLITH_THREADS);
    }

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    // Повторяем только быстрые отказы: после таймаута монолит, скорее всего, перегружен,
    // и повтор лишь добавит ему нагрузки.
    private static boolean isFastFailure(Throwable error) {
        if (error instanceof HttpServerErrorException serverError) {
            return serverError.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE;
        }

        return error instanceof ResourceAccessException && error.getCause() instanceof ConnectException;
    }
}
