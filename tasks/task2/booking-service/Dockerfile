FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY booking-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY booking-service/src /app
COPY booking.proto /app/booking.proto

RUN python -m grpc_tools.protoc -I /app \
      --python_out=/app \
      --grpc_python_out=/app \
      /app/booking.proto

ENV PYTHONPATH=/app
CMD ["python", "main.py"]