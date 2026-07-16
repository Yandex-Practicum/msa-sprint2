FROM gradle:8.5-jdk21 AS build
WORKDIR /app
COPY booking-service ./booking-service

WORKDIR /app/booking-service
RUN ./gradlew --no-daemon bootJar -x test

FROM openjdk:21-ea-1-slim
WORKDIR /app
COPY --from=build /app/booking-service/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]