
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOKING_GRPC_URL =
  process.env.BOOKING_GRPC_URL || 'localhost:9090';

const PROTO_PATH = path.join(__dirname, 'booking.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const bookingProto =
  grpc.loadPackageDefinition(packageDefinition).booking;

const client = new bookingProto.BookingService(
  BOOKING_GRPC_URL,
  grpc.credentials.createInsecure()
);

export function createBooking(userId, hotelId, promoCode) {
  return new Promise((resolve, reject) => {
    client.CreateBooking(
      {
        user_id: userId,
        hotel_id: hotelId,
        promo_code: promoCode || '',
      },
      (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      }
    );
  });
}

export function listBookings(userId) {
  return new Promise((resolve, reject) => {
    client.ListBookings(
      { user_id: userId },
      (err, response) => {
        if (err) reject(err);
        else resolve(response.bookings);
      }
    );
  });
}
