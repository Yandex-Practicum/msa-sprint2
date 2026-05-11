FROM debian:bullseye-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    bash \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL "https://github.com/fullstorydev/grpcurl/releases/download/v1.8.9/grpcurl_1.8.9_linux_arm64.tar.gz" | tar xz -C /usr/local/bin

COPY booking.proto /app/booking.proto

COPY wait-for-it.sh /usr/local/bin/wait-for-it
COPY init-fixtures.sql regress.sh ./
RUN chmod +x /usr/local/bin/wait-for-it regress.sh

ENTRYPOINT ["./regress.sh"]
