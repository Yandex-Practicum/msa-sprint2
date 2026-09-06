FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY main.go .
RUN CGO_ENABLED=0 go build -o booking-service main.go

FROM alpine:3.19

RUN apk add --no-cache curl ca-certificates

WORKDIR /app
COPY --from=builder /app/booking-service .

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

CMD ["./booking-service"]
