FROM amazoncorretto:17-alpine
WORKDIR /app
COPY build/libs/*.jar app.jar
EXPOSE 8081 9090
ENTRYPOINT ["java", "-jar", "app.jar"]