FROM golang:1.22-alpine AS build

WORKDIR /app
COPY main.go .
RUN go build -o booking-service main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/booking-service /app/booking-service

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:8080/ping || exit 1

CMD ["/app/booking-service"]