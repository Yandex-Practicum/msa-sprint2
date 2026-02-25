FROM golang:1.22-alpine AS builder

WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/booking-service main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget
RUN adduser -D appuser

WORKDIR /app
COPY --from=builder /out/booking-service /app/booking-service

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ping >/dev/null || exit 1

USER appuser
ENTRYPOINT ["/app/booking-service"]
