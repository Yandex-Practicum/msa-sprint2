package com.hotelio;

import com.hotelio.monolith.repository.BookingRepository;
import com.hotelio.monolith.service.BookingService;
import com.hotelio.proto.booking.BookingServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@ConditionalOnProperty(prefix = "booking.service", name = "external-host")
public class BookingServiceProxyConfig {

    @Value("${booking.service.external-host}")
    private String host;

    @Value("${booking.service.external-port:9090}")
    private int port;

    @Bean
    public ManagedChannel grpcChannel() {
        return ManagedChannelBuilder.forAddress(host, port).usePlaintext().build();
    }

    @Bean
    @Primary
    public BookingService grpcBookingService(ManagedChannel grpcChannel, BookingRepository bookingRepository) {
        return new GrpcBookingService(BookingServiceGrpc.newBlockingStub(grpcChannel), bookingRepository);
    }
}
