# syntax=docker/dockerfile:1
# Контекст сборки — tasks/task2/results: сервису нужен общий модуль contracts.
FROM gradle:8.7-jdk17 AS build
WORKDIR /workspace
COPY contracts contracts
COPY booking-history-service booking-history-service
WORKDIR /workspace/booking-history-service
RUN --mount=type=cache,target=/home/gradle/.gradle gradle --no-daemon build

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/booking-history-service/build/libs/booking-history-service-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
