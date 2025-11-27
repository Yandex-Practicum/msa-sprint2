FROM golang:1.24-alpine3.22 AS build
WORKDIR /
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -o app ./cmd/migrations/main.go

FROM alpine:3.22

COPY --from=build /app .
COPY migration/pg /migration
ENTRYPOINT ["/app", "-migrations-dir=/migration"]
CMD ["up"]
