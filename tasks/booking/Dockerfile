# Stage 1: Build Environment
FROM python:3.12-alpine3.19 AS base

WORKDIR /app

# Copy requirements and install dependencies
COPY ./requirements.txt .

# Create a virtual environment and install dependencies
RUN python -m venv .venv && \
    ./.venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./data ./data

# Stage 2: Runtime Environment
FROM python:3.12-alpine3.19

WORKDIR /app

# Copy the virtual environment from the build stage
COPY --from=base /app/.venv .venv

# Set the PATH to include the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Copy the application code
COPY --from=base /app/data ./data

# Copy the entrypoint script
COPY ./entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 9090

ENTRYPOINT ["./entrypoint.sh"]