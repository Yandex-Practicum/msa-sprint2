package com.hotelio.booking.config;

import com.hotelio.booking.constants.BookingTopics;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    private static final int BOOKING_CREATED_PARTITIONS = 3;

    @Bean
    public NewTopic bookingCreatedTopic() {
        return TopicBuilder.name(BookingTopics.BOOKING_CREATED)
            .partitions(BOOKING_CREATED_PARTITIONS)
            .replicas(1)
            .build();
    }
}
