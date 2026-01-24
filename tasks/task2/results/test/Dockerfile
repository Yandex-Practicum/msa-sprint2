FROM debian:bullseye-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY wait-for-it.sh /usr/local/bin/wait-for-it
COPY init-fixtures.sql /app/
COPY init-fixtures-new.sql /app/
COPY regress.sh /app/
RUN sed -i 's/\r$//' /usr/local/bin/wait-for-it /app/regress.sh && \
    chmod +x /usr/local/bin/wait-for-it /app/regress.sh
#RUN chmod +x /usr/local/bin/wait-for-it regress.sh

ENTRYPOINT ["/app/regress.sh"]
