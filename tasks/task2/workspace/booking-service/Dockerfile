FROM gradle:8.5-jdk17 AS build
WORKDIR /home/gradle/project
COPY . .
RUN gradle clean bootJar --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /home/gradle/project/build/libs/*.jar app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]
