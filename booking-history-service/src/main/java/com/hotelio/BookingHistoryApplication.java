package com.hotelio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;

@SpringBootApplication(scanBasePackages = {"com.hotelio"})
@EnableKafka
public class BookingHistoryApplication {
    public static void main(String[] args) {
        SpringApplication.run(BookingHistoryApplication.class, args);
    }
}
