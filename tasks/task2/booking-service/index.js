import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { Pool } from 'pg';
import axios from 'axios';
import { Kafka } from 'kafkajs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Proto
const PROTO_PATH = path.resolve(__dirname, 'booking.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).booking;

// Config
const PORT = Number(process.env.GRPC_PORT || 9090);
const MONOLITH_BASE_URL = process.env.MONOLITH_BASE_URL || 'http://hotelio-monolith:8080';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'booking-db',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'booking',
  password: process.env.DB_PASSWORD || 'booking',
  database: process.env.DB_NAME || 'booking',
};

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'booking.created';

const pool = new Pool(DB_CONFIG);

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT,
      hotel_id TEXT,
      promo_code TEXT,
      discount_percent DOUBLE PRECISION,
      price DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function basePriceForStatus(status) {
  return status && String(status).toUpperCase() === 'VIP' ? 80.0 : 100.0;
}

async function validateAndPrice(userId, hotelId, promoCode) {
  // Minimal set of checks aligned with monolith endpoints observed in tests
  const [authorizedRes, operationalRes, fullyRes, trustedRes, statusRes] = await Promise.all([
    axios.get(`${MONOLITH_BASE_URL}/api/users/${encodeURIComponent(userId)}/authorized`).catch(() => ({ data: false })),
    axios.get(`${MONOLITH_BASE_URL}/api/hotels/${encodeURIComponent(hotelId)}/operational`).catch(() => ({ data: true })),
    axios.get(`${MONOLITH_BASE_URL}/api/hotels/${encodeURIComponent(hotelId)}/fully-booked`).catch(() => ({ data: false })),
    axios.get(`${MONOLITH_BASE_URL}/api/reviews/hotel/${encodeURIComponent(hotelId)}/trusted`).catch(() => ({ data: true })),
    axios.get(`${MONOLITH_BASE_URL}/api/users/${encodeURIComponent(userId)}/status`).catch(() => ({ data: 'ACTIVE' })),
  ]);

  if (!authorizedRes.data) throw new Error('User is inactive');
  if (fullyRes.data) throw new Error('Hotel is fully booked');
  if (!operationalRes.data) throw new Error('Hotel is not operational');
  if (!trustedRes.data) throw new Error('Hotel is not trusted');

  const status = statusRes?.data || 'ACTIVE';
  const basePrice = basePriceForStatus(status);

  let discount = 0.0;
  if (promoCode) {
    const promo = await axios
      .post(`${MONOLITH_BASE_URL}/api/promos/validate`, null, { params: { code: promoCode, userId } })
      .then((r) => r.data)
      .catch(() => null);
    if (promo && typeof promo.discount === 'number') {
      discount = promo.discount;
    }
  }

  const finalPrice = basePrice - discount;
  return { discount, finalPrice };
}

async function publishEvent(producer, payload) {
  await producer.send({
    topic: KAFKA_TOPIC,
    messages: [{ key: String(payload.id), value: JSON.stringify(payload) }],
  });
}

function startServer() {
  const kafka = new Kafka({ clientId: 'booking-service', brokers: [KAFKA_BROKER] });
  const producer = kafka.producer();

  const server = new grpc.Server();
  server.addService(proto.BookingService.service, {
    CreateBooking: async (call, callback) => {
      const { user_id, hotel_id, promo_code } = call.request;
      try {
        const { discount, finalPrice } = await validateAndPrice(user_id, hotel_id, promo_code);
        const result = await pool.query(
          'INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
          [user_id, hotel_id, promo_code || null, discount, finalPrice]
        );
        const row = result.rows[0];
        const response = {
          id: String(row.id),
          user_id,
          hotel_id,
          promo_code: promo_code || '',
          discount_percent: discount,
          price: finalPrice,
          created_at: new Date(row.created_at).toISOString(),
        };

        // Emit event
        await producer.connect();
        await publishEvent(producer, {
          id: row.id,
          userId: user_id,
          hotelId: hotel_id,
          promoCode: promo_code || null,
          discountPercent: discount,
          price: finalPrice,
          createdAt: response.created_at,
        });
        await producer.disconnect();

        callback(null, response);
      } catch (err) {
        callback({ code: grpc.status.FAILED_PRECONDITION, message: err.message });
      }
    },

    ListBookings: async (call, callback) => {
      const { user_id } = call.request;
      try {
        const res = await pool.query(
          'SELECT * FROM booking WHERE ($1::text IS NULL OR user_id = $1::text) ORDER BY id',
          [user_id ? String(user_id) : null]
        );
        const bookings = res.rows.map((r) => ({
          id: String(r.id),
          user_id: r.user_id,
          hotel_id: r.hotel_id,
          promo_code: r.promo_code || '',
          discount_percent: Number(r.discount_percent || 0),
          price: Number(r.price),
          created_at: new Date(r.created_at).toISOString(),
        }));
        callback(null, { bookings });
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },
  });

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), async () => {
    await initSchema();
    console.log(`gRPC booking-service listening on ${PORT}`);
    server.start();
  });
}

startServer();
