import os


def env_str(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


MONOLITH_BASE_URL = env_str("MONOLITH_BASE_URL", "http://monolith:8080").rstrip("/")
DATABASE_URL = env_str(
    "DATABASE_URL",
    "postgresql://hotelio:hotelio@booking-db:5432/hotelio_booking",
)
KAFKA_BOOTSTRAP = env_str("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = env_str("KAFKA_BOOKING_TOPIC", "booking-events")
GRPC_PORT = int(env_str("GRPC_PORT", "9090"))
