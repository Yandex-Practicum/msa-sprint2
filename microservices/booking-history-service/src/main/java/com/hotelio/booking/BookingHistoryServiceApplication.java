package com.hotelio.booking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@EnableConfigurationProperties
@ConfigurationPropertiesScan
@SpringBootApplication
public class BookingHistoryServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(BookingHistoryServiceApplication.class, args);
    }
}
