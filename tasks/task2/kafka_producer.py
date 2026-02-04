import datetime
import json
import logging
from typing import Dict, Any, Optional
from confluent_kafka import Producer, KafkaError
from config import KafkaConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KafkaProducerService:
    """Service for producing messages to Kafka topics"""
    
    def __init__(self):
        self.config = KafkaConfig.get_producer_config()
        self.producer = Producer(self.config)
        logger.info(f"Kafka Producer initialized with config: {self.config}")
    
    def delivery_report(self, err, msg):
        """Callback for delivery reports"""
        if err is not None:
            logger.error(f"Message delivery failed: {err}")
        else:
            logger.info(f"Message delivered to {msg.topic()} [{msg.partition()}] at offset {msg.offset()}")
    
    def _produce_message(self, topic: str, key: Optional[str], value: Dict[str, Any]):
        """
        Produce a message to Kafka topic
        
        Args:
            topic: Kafka topic name
            key: Message key (for partitioning)
            value: Message value (will be JSON serialized)
        """
        try:
            # Serialize value to JSON
            json_value = json.dumps(value)
            
            # Produce message
            self.producer.produce(
                topic=topic,
                key=key,
                value=json_value,
                callback=self.delivery_report
            )
            
            # Trigger delivery report callbacks
            self.producer.poll(0)
            
            logger.info(f"Produced message to topic '{topic}' with key '{key}'")
            
        except Exception as e:
            logger.error(f"Error producing message: {str(e)}")
            raise
    
    
    def produce_message(self,  key: Optional[str], value: Dict[str, Any]):
        """
        Produce a message to Kafka topic
        
        Args:
            key: Message key (for partitioning)
            value: Message value (will be JSON serialized)
        """
        self._produce_message(topic=KafkaConfig.BOOKING_TOPIC, key=key, value = value)

       
    
    def flush(self):
        """Wait for all messages to be delivered"""
        self.producer.flush()
        logger.info("All messages flushed")
    
    def __del__(self):
        """Cleanup on destruction"""
        self.flush()