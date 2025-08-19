# Stage 1: Build Environment
FROM python:3.12-alpine3.19 AS base

WORKDIR /app

COPY ./requirements.txt .

RUN python -m venv .venv && \
    ./.venv/bin/pip install --no-cache-dir -r requirements.txt

COPY . .


# Stage 2: Runtime Environment
FROM python:3.12-alpine3.19

WORKDIR /app

# Copy the virtual environment from the build stage
COPY --from=base /app/.venv .venv

# Set the PATH to include the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

COPY --from=base /app/main.py .
COPY --from=base /app/settings.py .

RUN chmod +x /app/main.py

EXPOSE 8080

ENTRYPOINT ["python3", "main.py"]