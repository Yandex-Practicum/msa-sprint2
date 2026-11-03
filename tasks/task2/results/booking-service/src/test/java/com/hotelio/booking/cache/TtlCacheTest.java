package com.hotelio.booking.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hotelio.booking.exception.MonolithUnavailableException;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class TtlCacheTest {

    private static final Duration TTL = Duration.ofMinutes(5);
    private static final String KEY = "hotel-1";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-03T10:00:00Z"));
    private final AtomicInteger loads = new AtomicInteger();

    @Test
    void get_freshEntry_doesNotCallLoader() {
        // given
        var cache = cache(Duration.ofHours(1));
        cache.get(KEY, this::load);

        // when
        clock.advance(Duration.ofMinutes(4));
        var value = cache.get(KEY, this::load);

        // then
        assertThat(value).isEqualTo("value-1");
        assertThat(loads).hasValue(1);
    }

    @Test
    void get_expiredEntry_reloadsValue() {
        // given
        var cache = cache(Duration.ofHours(1));
        cache.get(KEY, this::load);

        // when
        clock.advance(Duration.ofMinutes(6));
        var value = cache.get(KEY, this::load);

        // then
        assertThat(value).isEqualTo("value-2");
    }

    @Test
    void get_expiredEntryAndSourceUnavailable_returnsStaleValue() {
        // given
        var cache = cache(Duration.ofHours(1));
        cache.get(KEY, this::load);

        // when
        clock.advance(Duration.ofMinutes(6));
        var value = cache.get(KEY, this::failingLoad);

        // then
        assertThat(value).isEqualTo("value-1");
    }

    @Test
    void get_noEntryAndSourceUnavailable_throwsMonolithUnavailable() {
        // given
        var cache = cache(Duration.ofHours(1));

        // when / then
        assertThatThrownBy(() -> cache.get(KEY, this::failingLoad))
            .isInstanceOf(MonolithUnavailableException.class);
    }

    private TtlCache<String, String> cache(Duration maxStale) {
        return new TtlCache<>(
            "test",
            TTL,
            maxStale,
            clock,
            new SimpleMeterRegistry()
        );
    }

    private String load(String key) {
        return "value-" + loads.incrementAndGet();
    }

    private String failingLoad(String key) {
        throw new MonolithUnavailableException(new RuntimeException("connection refused"));
    }

    // Caffeine считает срок жизни по своему тикеру, поэтому maxStale в тестах берётся с запасом,
    // а свежесть проверяется по этим часам.
    private static final class MutableClock extends Clock {

        private Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
