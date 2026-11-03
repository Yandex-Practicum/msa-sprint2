# Используем официальный минимальный образ Go
FROM golang:1.21-alpine

# curl нужен для проверок изнутри контейнера
RUN apk add --no-cache curl

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем исходник. check-dns.sh в образ не нужен: он запускает kubectl с машины разработчика
COPY main.go .

# Собираем бинарник из main.go
RUN go build -o booking-service main.go

EXPOSE 8080

# Команда запуска
CMD ["./booking-service"]
