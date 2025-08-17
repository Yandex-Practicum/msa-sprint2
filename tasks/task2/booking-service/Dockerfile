FROM golang:1.24-alpine AS builder

RUN apk add --no-cache protoc protobuf-dev && \
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod tidy && go mod download

COPY . .

RUN protoc --go_out=. --go-grpc_out=. proto/booking.proto

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/server ./server

FROM alpine:3.22.1

# Устанавливаем tzdata для работы с временными зонами
RUN apk add --no-cache tzdata

COPY --from=builder /app/bin/server /app/server

WORKDIR /app

# Порт gRPC
EXPOSE 9090

# Запуск сервера
CMD ["/app/server"]