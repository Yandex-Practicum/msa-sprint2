FROM debian:bookworm-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    bash \
    && rm -rf /var/lib/apt/lists/*

# grpcurl — для проверки booking-service напрямую по gRPC
COPY --from=fullstorydev/grpcurl:v1.9.1 /bin/grpcurl /usr/local/bin/grpcurl

COPY wait-for-it.sh /usr/local/bin/wait-for-it
COPY init-fixtures.sql regress.sh migrate-bookings.sh ./
RUN chmod +x /usr/local/bin/wait-for-it regress.sh migrate-bookings.sh

ENTRYPOINT ["./regress.sh"]
