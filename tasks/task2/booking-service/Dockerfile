FROM eclipse-temurin:17-jre

WORKDIR /app

COPY build/libs/booking-service-1.0.0.jar app.jar

EXPOSE 9090

ENTRYPOINT ["java", "-jar", "app.jar"]