# Multi-stage build
FROM gradle:8.5-jdk17 AS builder
WORKDIR /app
COPY . .
RUN gradle clean build -x test --no-daemon

FROM openjdk:17-ea-17-slim
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 9090 8081
ENTRYPOINT ["java", "-jar", "app.jar"]