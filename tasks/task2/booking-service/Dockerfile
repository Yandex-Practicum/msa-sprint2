FROM openjdk:17-jdk-slim

WORKDIR /app

# Копируем gradle wrapper
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# Копируем исходный код
COPY src src

# Делаем gradlew исполняемым
RUN chmod +x gradlew

# Собираем приложение
RUN ./gradlew build -x test

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --ingroup appuser appuser

# Копируем собранный JAR
RUN ls -la build/ && find build -name "*.jar" -exec cp {} app.jar \;

# Меняем владельца
RUN chown appuser:appuser app.jar

# Переключаемся на пользователя
USER appuser

# Открываем порт
EXPOSE 8080

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"]
