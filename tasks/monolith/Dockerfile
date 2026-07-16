FROM openjdk:17-ea-3-jdk-slim

WORKDIR /app

COPY hotelio-monolith-1.1.0.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]