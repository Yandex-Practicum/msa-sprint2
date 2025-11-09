FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 go build -v -o /out/booking-history-service ./cmd/booking-history-service

FROM alpine:3.20
RUN adduser -D -h /app app
WORKDIR /app
COPY --from=build /out/booking-history-service /app/booking-history-service
COPY --from=build /src/internal/db/migrations /app/migrations
RUN chmod +x /app/booking-history-service && chown -R app:app /app
USER app
ENTRYPOINT ["/app/booking-history-service"]
