import os

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9093")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "booking-created")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "booking-history-service")
KAFKA_AUTO_OFFSET_RESET = os.getenv("KAFKA_AUTO_OFFSET_RESET", "earliest")


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5433"))
DB_NAME = os.getenv("DB_NAME", "hotelio")
DB_USER = os.getenv("DB_USER", "hotelio")
DB_PASSWORD = os.getenv("DB_PASSWORD", "hotelio")
