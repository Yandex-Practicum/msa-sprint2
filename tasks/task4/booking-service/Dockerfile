FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY main.go .
RUN go mod init booking-service
RUN go build -o booking-service main.go

FROM alpine:latest
RUN apk add --no-cache curl

WORKDIR /app
COPY --from=builder /app/booking-service .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["./booking-service"]
