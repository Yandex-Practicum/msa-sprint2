FROM debian:bullseye-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY wait-for-it.sh /usr/local/bin/wait-for-it
COPY init-fixtures.sql regress_new.sh ./
RUN sed -i 's/\r$//' regress_new.sh /usr/local/bin/wait-for-it
RUN chmod +x /usr/local/bin/wait-for-it regress_new.sh

ENTRYPOINT ["./regress_new.sh"]
