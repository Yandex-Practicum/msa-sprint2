import pg from 'pg';
import { Kafka } from 'kafkajs';

const TOPIC = process.env.KAFKA_TOPIC || 'booking-events';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await db.query(`
  CREATE TABLE IF NOT EXISTS booking_history (
    booking_id VARCHAR(64) PRIMARY KEY, user_id VARCHAR(255), hotel_id VARCHAR(255), promo_code VARCHAR(255),
    discount_percent DOUBLE PRECISION, price DOUBLE PRECISION, created_at TIMESTAMPTZ, received_at TIMESTAMPTZ DEFAULT now());
  CREATE OR REPLACE VIEW stats_by_user  AS SELECT user_id,  count(*) bookings, sum(price) revenue FROM booking_history GROUP BY user_id;
  CREATE OR REPLACE VIEW stats_by_hotel AS SELECT hotel_id, count(*) bookings, sum(price) revenue FROM booking_history GROUP BY hotel_id;
  CREATE OR REPLACE VIEW stats_by_day   AS SELECT created_at::date AS day, count(*) bookings, sum(price) revenue FROM booking_history GROUP BY 1;`);

const consumer = new Kafka({ clientId: 'booking-history-service', brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(',') })
  .consumer({ groupId: 'booking-history' });

await consumer.connect();
await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
await consumer.run({
  eachMessage: async ({ message }) => {
    const e = JSON.parse(message.value.toString());
    if (e.type !== 'BookingCreated') return;
    await db.query(
      `INSERT INTO booking_history (booking_id, user_id, hotel_id, promo_code, discount_percent, price, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (booking_id) DO NOTHING`,
      [e.id, e.userId, e.hotelId, e.promoCode || null, e.discountPercent, e.price, e.createdAt || null]);
    console.log('BookingCreated saved to history:', e.id, e.userId, e.hotelId);
  },
});
console.log(`booking-history-service listening ${TOPIC}`);
