FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY proto ./proto

# если генерацию хочешь делать в контейнере:
RUN python -m grpc_tools.protoc -I ./proto --python_out=./app --grpc_python_out=./app ./proto/booking.proto

CMD ["python", "-u", "app/server.py"]