# syntax=docker/dockerfile:1
# Контекст сборки — tasks/task2/results: сервису нужен общий модуль contracts.
FROM gradle:8.7-jdk17 AS build
WORKDIR /workspace
COPY contracts contracts
COPY booking-service booking-service
WORKDIR /workspace/booking-service
RUN --mount=type=cache,target=/home/gradle/.gradle gradle --no-daemon build

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/booking-service/build/libs/booking-service-1.0.0.jar app.jar
EXPOSE 8080 9090
ENTRYPOINT ["java", "-jar", "app.jar"]
