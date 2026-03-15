# Используем официальный минимальный образ Go
FROM golang:1.21-alpine AS builder

# Устанавливаем необходимые пакеты (curl при необходимости, git и т.д.)
RUN apk add --no-cache ca-certificates git
WORKDIR /src
# Копируем исходники
COPY main.go .
# Собираем бинарник
RUN CGO_ENABLED=0 GOOS=linux go build -o booking-service main.go

# Финальный минимальный образ
FROM alpine:3.18

RUN apk add --no-cache ca-certificates curl
# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем бинарник из билд-стадии
COPY --from=builder /src/booking-service .

# Открываем порт
EXPOSE 8080
# По-умолчанию запускаем бинарник
CMD ["./booking-service"]
