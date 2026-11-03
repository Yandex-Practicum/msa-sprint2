package com.hotelio.booking.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.hotelio.booking.exception.MonolithUnavailableException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Function;
import lombok.extern.slf4j.Slf4j;

/**
 * Cache-aside с TTL. Свежее значение отдаётся без запроса к источнику. После TTL значение загружается заново,
 * а если источник недоступен — отдаётся устаревшее, пока ему не больше maxStale.
 * Одновременные загрузки одного ключа объединяются в одну.
 */
@Slf4j
public class TtlCache<K, V> {

    private static final long MAX_SIZE = 10_000;

    private final String name;
    private final Duration ttl;
    private final Clock clock;
    private final Counter staleHits;
    private final Cache<K, Entry<V>> entries;
    private final ConcurrentMap<K, CompletableFuture<V>> inFlightLoads = new ConcurrentHashMap<>();

    public TtlCache(
        String name,
        Duration ttl,
        Duration maxStale,
        Clock clock,
        MeterRegistry meterRegistry
    ) {
        this.name = name;
        this.ttl = ttl;
        this.clock = clock;
        this.staleHits = Counter.builder("booking.cache.stale")
            .tag("cache", name)
            .register(meterRegistry);
        this.entries = Caffeine.newBuilder()
            .expireAfterWrite(ttl.plus(maxStale))
            .maximumSize(MAX_SIZE)
            .build();
    }

    public V get(K key, Function<K, V> loader) {
        var cached = entries.getIfPresent(key);
        if (cached != null && cached.isFresh(clock.instant(), ttl)) {
            return cached.value();
        }

        try {
            return load(key, loader);
        } catch (MonolithUnavailableException e) {
            if (cached == null) {
                throw e;
            }

            log.warn("Monolith is unavailable, using stale '{}' value for key {} loaded at {}", name, key, cached.loadedAt());
            staleHits.increment();

            return cached.value();
        }
    }

    private V load(K key, Function<K, V> loader) {
        var ownLoad = new CompletableFuture<V>();
        var runningLoad = inFlightLoads.putIfAbsent(key, ownLoad);
        if (runningLoad != null) {
            return await(runningLoad);
        }

        try {
            var value = loader.apply(key);
            entries.put(key, new Entry<>(value, clock.instant()));
            ownLoad.complete(value);

            return value;
        } catch (RuntimeException e) {
            ownLoad.completeExceptionally(e);
            throw e;
        } finally {
            inFlightLoads.remove(key, ownLoad);
        }
    }

    private V await(CompletableFuture<V> load) {
        try {
            return load.join();
        } catch (CompletionException e) {
            if (e.getCause() instanceof RuntimeException cause) {
                throw cause;
            }

            throw e;
        }
    }

    private record Entry<V>(V value, Instant loadedAt) {

        boolean isFresh(Instant now, Duration ttl) {
            return loadedAt.plus(ttl).isAfter(now);
        }
    }
}
