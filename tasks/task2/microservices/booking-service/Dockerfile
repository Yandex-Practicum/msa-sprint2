FROM python:3.11-slim

WORKDIR /booking_service

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p ./app
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=./app \
    --grpc_python_out=./app \
    ./proto/booking.proto



RUN chmod +x ./entrypoint.sh
EXPOSE 5000
ENTRYPOINT ["./entrypoint.sh"]
