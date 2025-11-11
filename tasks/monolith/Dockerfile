FROM maven:3.9.9-eclipse-temurin-17

WORKDIR /app

COPY hotelio-monolith-1.0.0.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]