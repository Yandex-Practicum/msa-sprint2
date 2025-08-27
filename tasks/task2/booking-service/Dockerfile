FROM python:3.11-slim

WORKDIR /booking_service

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY proto/ ./proto/
RUN mkdir -p ./app
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=./app \
    --grpc_python_out=./app \
    ./proto/booking.proto

COPY app/ ./app/

WORKDIR /booking_service/app
COPY start.sh /start.sh
RUN chmod +x /start.sh
CMD ["/start.sh"]
