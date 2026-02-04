import json
import logging
import signal
import sys
from typing import Callable, Dict, Any
from confluent_kafka import Consumer, KafkaError, KafkaException
from config import KafkaConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KafkaConsumerService:
    """Service for consuming messages from Kafka topics"""
    
    def __init__(self, group_id: str = KafkaConfig.BOOKING_CONSUMER_GROUP):
        self.group_id = group_id
        self.config = KafkaConfig.get_consumer_config(group_id)
        self.consumer = Consumer(self.config)
        self.running = False
        
        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        logger.info(f"Kafka Consumer initialized with group: {group_id}")
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
    
    def subscribe(self, topics: list):
        """Subscribe to Kafka topics"""
        self.consumer.subscribe(topics)
        logger.info(f"Subscribed to topics: {topics}")
    
    def consume_messages(self, 
                        callback: Callable[[Dict[str, Any], Dict[str, Any]], None],
                        timeout: float = 1.0):
        """
        Continuously consume messages and process them with callback
        
        Args:
            callback: Function to process messages (receives key, value)
            timeout: Poll timeout in seconds
        """
        self.running = True
        
        try:
            while self.running:
                msg = self.consumer.poll(timeout)
                
                if msg is None:
                    continue
                
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        # End of partition event
                        logger.info(f"Reached end of partition {msg.partition()}")
                    else:
                        raise KafkaException(msg.error())
                else:
                    # Process the message
                    try:
                        # Parse key and value
                        key = msg.key().decode('utf-8') if msg.key() else None
                        value = json.loads(msg.value().decode('utf-8'))
                        
                        # Log message details
                        logger.info(f"Received message: topic={msg.topic()}, "
                                   f"partition={msg.partition()}, "
                                   f"offset={msg.offset()}, key={key}")
                        
                        # Process with callback
                        callback(key, value)
                        
                        # Commit offset
                        self.consumer.commit(asynchronous=False)
                        
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to decode JSON: {str(e)}")
                    except Exception as e:
                        logger.error(f"Error processing message: {str(e)}")
        
        except KeyboardInterrupt:
            logger.info("Consumer interrupted by user")
        finally:
            self.close()
    
    def consume_bookings(self, 
                        booking_handler: Callable[[Dict[str, Any]], None],
                        timeout: float = 1.0):
        """
        Consume booking events and process them
        
        Args:
            booking_handler: Function to handle booking events
            timeout: Poll timeout
        """
        def booking_callback(key, value):
            logger.info(f"Consuming booking event: {key,value}")
            event_type = value.get('event_type')
            payload = value.get('payload', {})
            
            logger.info(f"Processing booking event: {event_type}")
            
            if event_type == 'booking_created':
                booking_handler(payload)
            else:
                logger.warning(f"Unknown event type: {event_type}")
        
        self.subscribe([KafkaConfig.BOOKING_TOPIC])
        self.consume_messages(booking_callback, timeout)
    
    def close(self):
        """Close the consumer connection"""
        self.consumer.close()
        logger.info("Consumer closed")