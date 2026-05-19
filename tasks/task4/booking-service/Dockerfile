# Используем официальный минимальный образ Go
FROM golang:1.21-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем Go-файл и скрипт проверки DNS
COPY main.go .
COPY check-dns.sh .

# Делаем скрипт исполняемым
RUN chmod +x check-dns.sh

# Собираем бинарник из main.go
RUN go build -o booking-service main.go

# Задаем команду запуска
CMD ["./booking-service"]