package com.hotelio.history.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConsumerConfig {

    private static final long RETRY_INTERVAL_MILLIS = 1000;
    private static final long MAX_RETRIES = 2;

    // После повторов сообщение пропускается с записью в лог, чтобы одно битое событие не остановило чтение топика.
    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        return new DefaultErrorHandler(new FixedBackOff(RETRY_INTERVAL_MILLIS, MAX_RETRIES));
    }

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
