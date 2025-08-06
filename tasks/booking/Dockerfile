FROM openjdk:17-jdk-slim

WORKDIR /app

COPY hotelio-monolith-1.0.0.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]