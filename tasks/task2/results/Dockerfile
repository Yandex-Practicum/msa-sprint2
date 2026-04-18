FROM maven:3.9.8-amazoncorretto-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/target/booking-history-service-1.0.0.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]