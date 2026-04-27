FROM golang:1.21-alpine AS builder

WORKDIR /src

COPY go.mod ./
COPY main.go main_test.go ./

RUN go test ./...
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/booking-service .

FROM alpine:3.20

RUN adduser -D -H appuser

WORKDIR /app
COPY --from=builder /out/booking-service ./booking-service

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ping || exit 1

USER appuser
CMD ["./booking-service"]
