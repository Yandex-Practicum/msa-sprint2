# Stage 1
FROM golang:1.21-alpine AS build
WORKDIR /src

COPY go.mod ./
COPY main.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o booking-service main.go

# Stage 2
FROM alpine:3.19

RUN apk add --no-cache curl && \
    adduser -D -u 1000 booking

WORKDIR /app

COPY --from=build /src/booking-service /app/booking-service

USER booking
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/ping >/dev/null || exit 1

CMD ["./booking-service"]