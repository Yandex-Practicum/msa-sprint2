# Multi-stage build для оптимизации размера образа

# Stage 1: Сборка приложения
FROM golang:1.21-alpine AS builder

# Устанавливаем необходимые пакеты для сборки
RUN apk add --no-cache git

# Устанавливаем рабочую директорию
WORKDIR /build

# Копируем файлы модуля и загружаем зависимости
COPY go.mod ./
RUN go mod download

# Копируем исходный код
COPY main.go .

# Собираем бинарник с оптимизациями
# -ldflags "-s -w" убирает debug информацию для уменьшения размера
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o booking-service main.go

# Stage 2: Финальный минимальный образ
FROM alpine:3.18

# Добавляем необходимые пакеты для runtime
# ca-certificates для HTTPS запросов, curl для health checks
RUN apk add --no-cache ca-certificates curl bash

# Создаём непривилегированного пользователя
RUN adduser -D -g '' appuser

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем бинарник из builder stage
COPY --from=builder /build/booking-service .

# Устанавливаем права на исполнение
RUN chmod +x booking-service

# Переключаемся на непривилегированного пользователя
USER appuser

# Открываем порт
EXPOSE 8080

# Health check для Docker
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ping || exit 1

# Запускаем приложение
CMD ["./booking-service"]
