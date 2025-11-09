
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git bash protobuf
ENV PATH="/go/bin:${PATH}"
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.34.1 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.4.0

COPY go.mod go.sum ./
RUN go mod download

COPY api/ api/
COPY internal/ internal/
COPY cmd/ cmd/

RUN mkdir -p internal/pb && \
    protoc --proto_path=api \
      --go_out=internal/pb --go_opt=paths=source_relative,Mbooking.proto=booking-service/internal/pb \
      --go-grpc_out=internal/pb --go-grpc_opt=paths=source_relative,Mbooking.proto=booking-service/internal/pb \
      booking.proto

RUN go mod tidy

ARG TARGETOS TARGETARCH
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN go build -v -o /out/booking-service ./cmd/booking-service

FROM --platform=$TARGETPLATFORM alpine:3.20
RUN adduser -D -h /app app
WORKDIR /app
COPY --from=build /out/booking-service /app/booking-service
COPY --from=build /src/internal/db/migrations /app/migrations
RUN chmod +x /app/booking-service && chown -R app:app /app
USER app
ENV GRPC_PORT=9090
ENTRYPOINT ["/app/booking-service"]
