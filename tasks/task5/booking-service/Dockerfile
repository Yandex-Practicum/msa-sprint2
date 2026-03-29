# Build
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -o booking-service -trimpath -ldflags="-s -w" .

# Runtime
FROM alpine:3.19
RUN adduser -D -u 65532 -g nobody appuser
WORKDIR /app
COPY --from=builder /app/booking-service .
USER appuser
EXPOSE 8080
CMD ["./booking-service"]
