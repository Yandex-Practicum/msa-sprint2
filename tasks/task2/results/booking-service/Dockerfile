FROM python:3.11-slim

WORKDIR /app

# Устанавливаем зависимости для PostgreSQL и компиляции
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Генерируем gRPC код
RUN python generate_grpc.py

EXPOSE 8000 9090

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]