FROM alpine/java:17-jdk

WORKDIR /app

COPY booking-history-service-1.0.0.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]