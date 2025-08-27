FROM python:3.11-slim

WORKDIR /booking_history
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

WORKDIR /booking_history/app
CMD ["python", "kafka_consumer.py"]
