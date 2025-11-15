# Используем официальный минимальный образ Go
FROM golang:1.21-alpine

# Добавим утилиты (curl может понадобиться в тестах)
RUN apk add --no-cache curl

# Рабочая директория
WORKDIR /app

# Копируем исходник и скрипт DNS-проверки
COPY booking-service/main.go .
COPY check-dns.sh .

# Делаем скрипт исполняемым
RUN chmod +x check-dns.sh

# Собираем бинарник
RUN go build -o booking-service main.go

# Команда запуска
CMD ["./booking-service"]
