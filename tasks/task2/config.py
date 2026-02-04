import os
from dotenv import load_dotenv

load_dotenv()

class KafkaConfig:
    # Kafka broker configuration
    BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
    
    # Topic names
    BOOKING_TOPIC = os.getenv('KAFKA_BOOKING_TOPIC', 'bookings')
    BOOKING_CONFIRMATION_TOPIC = os.getenv('KAFKA_BOOKING_CONFIRMATION_TOPIC', 'booking-confirmations')
    
    # Consumer groups
    BOOKING_CONSUMER_GROUP = os.getenv('KAFKA_BOOKING_CONSUMER_GROUP', 'booking-service-group')
    
    # Security (if needed)
    SECURITY_PROTOCOL = os.getenv('KAFKA_SECURITY_PROTOCOL', 'PLAINTEXT')
    SASL_MECHANISM = os.getenv('KAFKA_SASL_MECHANISM', 'PLAIN')
    SASL_USERNAME = os.getenv('KAFKA_SASL_USERNAME')
    SASL_PASSWORD = os.getenv('KAFKA_SASL_PASSWORD')
    
    @classmethod
    def get_producer_config(cls):
        config = {
            'bootstrap.servers': cls.BOOTSTRAP_SERVERS,
        }
        
        if cls.SECURITY_PROTOCOL != 'PLAINTEXT':
            config.update({
                'security.protocol': cls.SECURITY_PROTOCOL,
                'sasl.mechanism': cls.SASL_MECHANISM,
                'sasl.username': cls.SASL_USERNAME,
                'sasl.password': cls.SASL_PASSWORD
            })
        
        return config
    
    @classmethod
    def get_consumer_config(cls, group_id):
        config = {
            'bootstrap.servers': cls.BOOTSTRAP_SERVERS,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',  # or 'latest'
            'enable.auto.commit': True,
        }
        
        if cls.SECURITY_PROTOCOL != 'PLAINTEXT':
            config.update({
                'security.protocol': cls.SECURITY_PROTOCOL,
                'sasl.mechanism': cls.SASL_MECHANISM,
                'sasl.username': cls.SASL_USERNAME,
                'sasl.password': cls.SASL_PASSWORD
            })
        
        return config