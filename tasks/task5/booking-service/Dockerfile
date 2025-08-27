# Используем официальный минимальный образ Go
FROM golang:1.21-alpine AS builder

# TODO: Добавить необходимые пакеты (например, curl)
# Ожидаемый код:
RUN apk add --no-cache curl

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем Go-файл и скрипт проверки DNS
COPY main.go .
COPY check-dns.sh .

# TODO: Сделать скрипт исполняемым
# Ожидаемый код:
RUN chmod +x check-dns.sh

# TODO: Собрать бинарник из main.go
# Ожидаемый код:
RUN go build -o booking-service main.go

# Используем минимальный образ Alpine
FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/booking-service .
COPY --from=builder /app/check-dns.sh .

ENV ENABLE_FEATURE_X=false

EXPOSE 8080

# TODO: Задать команду запуска
# Ожидаемый код:
CMD ["./booking-service"]
