const { Kafka } = require('kafkajs');
const historyService = require('../services/historyService');

const BROKER = process.env.KAFKA_BROKER || 'kafka:9092';

console.log('Kafka broker used (consumer):', BROKER);

const kafka = new Kafka({
    clientId: 'booking-history-service',
    brokers: [BROKER],
});

const consumer = kafka.consumer({ groupId: 'booking-history-group' });

const startConsumer = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'BookingCreated', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const event = JSON.parse(message.value.toString());
                console.log('Raw event received:', JSON.stringify(event, null, 2));
                console.log(`Received event: BookingCreated ${event.id}`);
                await historyService.saveBookingEvent(event);
            } catch (error) {
                console.error('Failed to process event:', error.message);
            }
        },
    });

    console.log('Kafka consumer started, waiting for messages...');
};

module.exports = { startConsumer };