package com.hotelio.booking.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GrpcServerLifecycle {

    private static final Logger log = LoggerFactory.getLogger(GrpcServerLifecycle.class);

    private Server server;

    private final BookingGrpcEndpoint bookingGrpcEndpoint;
    private final int port;

    public GrpcServerLifecycle(BookingGrpcEndpoint bookingGrpcEndpoint,
                               @Value("${grpc.server.port:9090}") int port) {
        this.bookingGrpcEndpoint = bookingGrpcEndpoint;
        this.port = port;
    }

    @PostConstruct
    public void start() throws IOException {
        server = ServerBuilder.forPort(port)
                .addService(bookingGrpcEndpoint)
                .build()
                .start();
        log.info("Booking gRPC server started, listening on port {}", port);
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.shutdown();
            log.info("Booking gRPC server stopped");
        }
    }
}