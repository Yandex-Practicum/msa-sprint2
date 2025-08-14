# Stage 1: Build Environment
FROM python:3.12-alpine3.19 AS base

# Install build dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev zlib-dev

WORKDIR /app

COPY ./requirements.txt .

RUN python -m venv .venv && \
    ./.venv/bin/pip install --no-cache-dir -r requirements.txt

COPY ./data ./data
COPY ./alembic.ini .


# Stage 2: Runtime Environment
FROM python:3.12-alpine3.19

WORKDIR /app

# Copy the virtual environment from the build stage
COPY --from=base /app/.venv .venv

# Set the PATH to include the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

COPY --from=base /app/data ./data
COPY --from=base /app/alembic.ini .

# Copy the entrypoint script
COPY ./entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 9090

ENTRYPOINT ["./entrypoint.sh"]