FROM debian:bullseye-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY wait-for-it.sh /usr/local/bin/wait-for-it
COPY init-fixtures.sql regress_2.sh ./
RUN chmod +x /usr/local/bin/wait-for-it regress_2.sh

ENTRYPOINT ["./regress_2.sh"]

