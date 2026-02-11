FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Генерация gRPC, для тестов лежит в _grpc
RUN python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. booking.proto

EXPOSE 9090

CMD ["python", "server.py"]
