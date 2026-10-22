import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import pg from 'pg';
import { Kafka } from 'kafkajs';

const MONOLITH = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';
const PORT = process.env.GRPC_PORT || '9090';
const TOPIC = process.env.KAFKA_TOPIC || 'booking-events';

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const producer = new Kafka({ clientId: 'booking-service', brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(',') }).producer();

const api = async (path, method = 'GET') => {
  const r = await fetch(MONOLITH + path, { method });
  if (!r.ok) return null;
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t.replace(/"/g, ''); }
};

const fail = (msg) => { const e = new Error(msg); e.code = grpc.status.FAILED_PRECONDITION; throw e; };

async function createBooking({ userId, hotelId, promoCode }) {
  console.log(`Creating booking: userId=${userId}, hotelId=${hotelId}, promoCode=${promoCode}`);
  if (!(await api(`/api/users/${userId}/active`))) fail('User is inactive');
  if (await api(`/api/users/${userId}/blacklisted`)) fail('User is blacklisted');
  if (!(await api(`/api/hotels/${hotelId}/operational`))) fail('Hotel is not operational');
  if (!(await api(`/api/reviews/hotel/${hotelId}/trusted`))) fail('Hotel is not trusted based on reviews');
  if ((await api(`/api/hotels/${hotelId}/fully-booked`)) !== false) fail('Hotel is fully booked');

  const status = await api(`/api/users/${userId}/status`);
  const base = String(status).toUpperCase() === 'VIP' ? 80 : 100;
  let discount = 0;
  if (promoCode) {
    const promo = await api(`/api/promos/validate?code=${encodeURIComponent(promoCode)}&userId=${userId}`, 'POST');
    discount = promo?.discount ?? 0;
  }

  const { rows: [b] } = await db.query(
    `INSERT INTO booking (user_id, hotel_id, promo_code, discount_percent, price, created_at)
     VALUES ($1,$2,$3,$4,$5,now()) RETURNING *`,
    [userId, hotelId, promoCode || null, discount, base - discount]);
  const res = toProto(b);

  producer.send({ topic: TOPIC, messages: [{ key: res.userId, value: JSON.stringify({ type: 'BookingCreated', ...res }) }] })
    .then(() => console.log('BookingCreated sent', res.id))
    .catch((e) => console.error('Kafka send failed:', e.message));

  console.log('Booking created', res);
  return res;
}

const toProto = (b) => ({
  id: String(b.id), userId: b.user_id, hotelId: b.hotel_id, promoCode: b.promo_code || '',
  discountPercent: b.discount_percent ?? 0, price: b.price, createdAt: b.created_at ? new Date(b.created_at).toISOString() : '',
});

async function listBookings({ userId }) {
  const { rows } = userId
    ? await db.query('SELECT * FROM booking WHERE user_id=$1 ORDER BY id', [userId])
    : await db.query('SELECT * FROM booking ORDER BY id');
  return { bookings: rows.map(toProto) };
}

const wrap = (fn) => (call, cb) => fn(call.request).then((r) => cb(null, r)).catch((e) => {
  console.error(e.message);
  cb({ code: e.code || grpc.status.INTERNAL, message: e.message });
});

await db.query(`CREATE TABLE IF NOT EXISTS booking (
  id BIGSERIAL PRIMARY KEY, user_id VARCHAR(255), hotel_id VARCHAR(255), promo_code VARCHAR(255),
  discount_percent DOUBLE PRECISION, price DOUBLE PRECISION NOT NULL, created_at TIMESTAMPTZ)`);
const connectKafka = () => producer.connect()
  .then(() => console.log('Kafka producer connected'))
  .catch((e) => { console.error('Kafka connect failed, retry in 5s:', e.message); setTimeout(connectKafka, 5000); });
connectKafka();

const proto = grpc.loadPackageDefinition(protoLoader.loadSync('booking.proto')).booking;
const server = new grpc.Server();
server.addService(proto.BookingService.service, { CreateBooking: wrap(createBooking), ListBookings: wrap(listBookings) });
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), () => console.log(`booking-service gRPC on :${PORT}`));
