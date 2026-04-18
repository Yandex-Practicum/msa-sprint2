package com.hotelio.bookinghistory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;

@EnableKafka
@SpringBootApplication
public class BookingHistoryServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(BookingHistoryServiceApplication.class, args);
    }
}