package com.hotelio.booking;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GrpcServerRunner {

    private final BookingGrpcService bookingGrpcService;
    private final int port;
    private Server server;

    public GrpcServerRunner(BookingGrpcService bookingGrpcService,
                            @Value("${grpc.server.port}") int port) {
        this.bookingGrpcService = bookingGrpcService;
        this.port = port;
    }

    @PostConstruct
    public void start() throws Exception {
        server = ServerBuilder.forPort(port)
                .addService(bookingGrpcService)
                .build()
                .start();
        System.out.println("booking-service gRPC started on " + port);
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.shutdown();
        }
    }
}