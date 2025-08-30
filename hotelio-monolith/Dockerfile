FROM openjdk:17-jdk-slim

WORKDIR /app

COPY /build/libs/hotelio-monolith-1.0.0.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]