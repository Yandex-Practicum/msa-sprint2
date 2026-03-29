import os


def env_str(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


DATABASE_URL = env_str(
    "DATABASE_URL",
    "postgresql://hotelio:hotelio@history-db:5432/hotelio_history",
)
KAFKA_BOOTSTRAP = env_str("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = env_str("KAFKA_BOOKING_TOPIC", "booking-events")
KAFKA_GROUP = env_str("KAFKA_CONSUMER_GROUP", "booking-history-service")
