FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY main.go .
RUN go mod init booking-service && go build -o booking-service main.go

FROM alpine:latest
RUN apk add --no-cache curl

WORKDIR /app
COPY --from=builder /app/booking-service .

EXPOSE 8080

CMD ["./booking-service"]
