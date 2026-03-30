import { Kafka } from 'kafkajs';
import { Pool } from 'pg';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'booking.created';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'history-db',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'history',
  password: process.env.DB_PASSWORD || 'history',
  database: process.env.DB_NAME || 'history'
};

const pool = new Pool(DB_CONFIG);

async function initSchemaWithRetry(retries = 10, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS booking_history (
          id BIGINT PRIMARY KEY,
          user_id TEXT,
          hotel_id TEXT,
          promo_code TEXT,
          discount_percent DOUBLE PRECISION,
          price DOUBLE PRECISION,
          created_at TIMESTAMPTZ
        );
      `);
      console.log('booking-history: schema ready');
      return;
    } catch (e) {
      console.error('booking-history: schema init failed, retrying...', e.message);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('booking-history: failed to init schema');
}

async function start() {
  await initSchemaWithRetry();
  const kafka = new Kafka({ clientId: 'booking-history-service', brokers: [KAFKA_BROKER] });
  const consumer = kafka.consumer({ groupId: 'booking-history-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        await pool.query(
          'INSERT INTO booking_history (id, user_id, hotel_id, promo_code, discount_percent, price, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
          [payload.id, payload.userId, payload.hotelId, payload.promoCode, payload.discountPercent, payload.price, payload.createdAt]
        );
        console.log('Saved booking history', payload.id);
      } catch (e) {
        console.error('Failed to process message', e.message);
      }
    }
  });
}

start().catch(err => { console.error(err); process.exit(1); });
