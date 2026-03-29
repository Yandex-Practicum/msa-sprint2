package com.hotelio.monolith.config;

import com.hotelio.monolith.grpc.GrpcBookingService;
import com.hotelio.monolith.service.BookingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BookingBeansLogger {

    private static final Logger log = LoggerFactory.getLogger(BookingBeansLogger.class);

    @Bean
    CommandLineRunner logBookingBeans(
            BookingService bookingService,
            org.springframework.beans.factory.ObjectProvider<GrpcBookingService> grpcBooking
    ) {
        return args -> {
            log.info("➡️  BookingService beans:");
            log.info("    - bookingService: {}", bookingService.getClass().getName());
            grpcBooking.ifAvailable(g ->
                    log.info("    - grpcBookingService: {}", g.getClass().getName())
            );
        };
    }
}
