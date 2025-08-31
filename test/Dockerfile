FROM debian:bullseye-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    bash \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

COPY wait-for-it.sh /usr/local/bin/wait-for-it
COPY init-fixtures.sql regress.sh ./
COPY init-fixtures.sql init-fixtures-booking-service.sql regress.sh ./
RUN chmod +x /usr/local/bin/wait-for-it regress.sh
RUN dos2unix regress.sh

ENTRYPOINT ["./regress.sh"]
