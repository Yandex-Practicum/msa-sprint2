package net.devh.boot.grpc.server.config

import net.devh.boot.grpc.server.autoconfigure.GrpcServerAutoConfiguration
import org.springframework.boot.autoconfigure.ImportAutoConfiguration
import org.springframework.context.annotation.Configuration

@Configuration
@ImportAutoConfiguration(GrpcServerAutoConfiguration::class)
class GrpcConfig