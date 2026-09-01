package com.hotelio.bookingservice.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.protobuf.services.ProtoReflectionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class GrpcServerConfig {

    @Bean(destroyMethod = "shutdown")
    public Server grpcServer(
            @Value("${grpc.server.port:9090}") int port,
            BookingGrpcService bookingGrpcService
    ) throws IOException {
        return ServerBuilder.forPort(port)
                .addService(bookingGrpcService)
                .addService(ProtoReflectionService.newInstance())
                .build()
                .start();
    }
}