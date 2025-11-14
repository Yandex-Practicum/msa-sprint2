FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x ./start.sh

ENV GRPC_PORT=50051
ENV HTTP_PORT=8080

EXPOSE 50051 8080

CMD ["./start.sh"]
