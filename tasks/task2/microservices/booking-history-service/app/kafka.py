import json
from kafka import KafkaConsumer
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError

from app.config import KAFKA_HOST, KAFKA_TOPIC
from app.db import save_booking_to_db
from app.logger import logger



def create_topic():
    admin_client = KafkaAdminClient(
        bootstrap_servers=KAFKA_HOST,
        client_id="booking-history-admin"
    )
    topic_list = [NewTopic(name=KAFKA_TOPIC, num_partitions=1, replication_factor=1)]

    try:
        admin_client.create_topics(new_topics=topic_list, validate_only=False)
        logger.info("Topic '%s' created", KAFKA_TOPIC)
    except TopicAlreadyExistsError:
        logger.info("Topic '%s' already exists", KAFKA_TOPIC)
    except Exception as e:
        logger.exception("Failed to create topic '%s': %s", KAFKA_TOPIC, e)
    finally:
        admin_client.close()

def consume():
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_HOST,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        group_id="booking-history"
    )

    logger.info("Listening to Kafka topic '%s'...", KAFKA_TOPIC)

    for message in consumer:
        data = message.value
        logger.info("Received booking: %s", data)
        save_booking_to_db(data)

