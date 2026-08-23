# Используем официальный минимальный образ Go
FROM golang:1.21-alpine

# Устанавливаем curl для проверок (healthcheck и тестов в CI/CD)
RUN apk add --no-cache curl

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем исходный код
COPY main.go .

# Собираем бинарный файл
RUN go build -o booking-service main.go

# Открываем порт 8080
EXPOSE 8080

# Команда запуска сервиса
CMD ["./booking-service"]
