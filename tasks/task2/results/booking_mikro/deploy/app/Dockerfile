FROM golang:1.24-alpine3.22 AS build
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -a -o APP_NAME ./cmd/app/main.go

FROM alpine:3.22
WORKDIR /app

COPY --from=build /app/APP_NAME .
CMD ["./APP_NAME"]
