import json
import logging
from kafka import KafkaConsumer
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.history_service import HistoryService

logger = logging.getLogger(__name__)


class BookingHistoryConsumer:
    def __init__(self, bootstrap_servers: str = 'kafka:9092'):
        self.bootstrap_servers = bootstrap_servers
        self.consumer = None
        self.connect()

    def connect(self):
        try:
            self.consumer = KafkaConsumer(
                'booking-events',
                bootstrap_servers=[self.bootstrap_servers],
                auto_offset_reset='earliest',
                enable_auto_commit=True,
                group_id='booking-history-group',
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )
            logger.info(f"Connected to Kafka at {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            self.consumer = None

    def start_consuming(self):
        """Запуск потребления сообщений"""
        if not self.consumer:
            logger.error("Kafka consumer not connected")
            return

        logger.info("Starting to consume booking events...")

        for message in self.consumer:
            try:
                event_data = message.value
                event_type = event_data.get('event_type')

                logger.info(f"Received event: {event_type} - {event_data}")

                # Получаем сессию БД для каждого сообщения
                db: Session = next(get_db())
                history_service = HistoryService(db)

                if event_type == 'BookingCreated':
                    history_service.process_booking_created_event(event_data)
                else:
                    logger.warning(f"Unknown event type: {event_type}")

            except Exception as e:
                logger.error(f"Error processing message: {e}")

    def close(self):
        if self.consumer:
            self.consumer.close()
            logger.info("Kafka consumer closed")