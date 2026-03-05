FROM golang:1.21-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY booking-service/main.go .
COPY check-dns.sh .

RUN chmod +x check-dns.sh
RUN go build -o booking-service main.go

EXPOSE 8080

CMD ["./booking-service"]
