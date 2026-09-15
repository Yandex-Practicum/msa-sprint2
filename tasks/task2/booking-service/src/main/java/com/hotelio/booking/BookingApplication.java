package com.hotelio.booking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BookingApplication {

    public static void main(String[] args) throws InterruptedException {
        SpringApplication.run(BookingApplication.class, args);
        Thread.currentThread().join();
    }
}