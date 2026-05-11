const { Kafka } = require('kafkajs');

const BROKER = 'kafka:9092';

const kafka = new Kafka({
    clientId: 'booking-service',
    brokers: [BROKER],
});

const producer = kafka.producer();

let isConnected = false;

const connectProducer = async () => {
    if (!isConnected) {
        try {
            await producer.connect();
            isConnected = true;
            console.log('Kafka producer connected to', BROKER);
        } catch (err) {
            console.error('Failed to connect producer:', err.message);
        }
    }
};

const sendBookingCreatedEvent = async (booking) => {
    try {
        await connectProducer();

        if (!isConnected) {
            console.log('Kafka not connected, event not sent');
            return;
        }

        const event = {
            id: booking.id,
            user_id: booking.user_id,
            hotel_id: booking.hotel_id,
            promo_code: booking.promo_code || '',
            discount_percent: booking.discount_percent,
            price: booking.price,
            created_at: booking.created_at || new Date().toISOString(),
        };

        await producer.send({
            topic: 'BookingCreated',
            messages: [{ value: JSON.stringify(event) }],
        });

        console.log(`Kafka event sent: BookingCreated ${booking.id}`);
    } catch (error) {
        console.error('Failed to send Kafka event:', error.message);
    }
};

module.exports = { sendBookingCreatedEvent };