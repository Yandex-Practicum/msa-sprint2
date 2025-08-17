FROM debian:bullseye-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    postgresql-client \
    bash \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/fullstorydev/grpcurl/releases/download/v1.8.7/grpcurl_1.8.7_linux_x86_64.tar.gz \
    && tar -xvf grpcurl_1.8.7_linux_x86_64.tar.gz \
    && mv grpcurl /usr/local/bin/ \
    && rm grpcurl_1.8.7_linux_x86_64.tar.gz

COPY wait-for-it.sh /usr/local/bin/wait-for-it
COPY init-fixtures.sql init-fixtures-bookings-service.sql regress.sh ./
RUN chmod +x /usr/local/bin/wait-for-it regress.sh

ENTRYPOINT ["./regress.sh"]
