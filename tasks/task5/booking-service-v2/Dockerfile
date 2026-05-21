FROM golang:1.21-alpine

WORKDIR /app

COPY main.go .

RUN go build -o booking-service-v2 main.go

CMD ["./booking-service-v2"]