FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    grpcio==1.64.0 \
    grpcio-tools==1.64.0 \
    kafka-python==2.0.2 \
    psycopg2-binary==2.9.9 \
    requests==2.32.3

COPY booking.proto ./
RUN python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. booking.proto

COPY server.py ./

EXPOSE 9090

CMD ["python", "server.py"]
