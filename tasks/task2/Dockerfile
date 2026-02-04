# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py .

# Create non-root user
#RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
#USER appuser

# Expose gRPC port
EXPOSE 50051

# Command to run the server
ENTRYPOINT ["python","booking-service.py"]