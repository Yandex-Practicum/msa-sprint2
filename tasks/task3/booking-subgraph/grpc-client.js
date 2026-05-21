import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, 'proto', 'booking.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'booking-service:9090';

const client = new proto.booking.BookingService(
  BOOKING_SERVICE_URL,
  grpc.credentials.createInsecure()
);

export const listBookings = (userId) => {
  return new Promise((resolve, reject) => {
    client.ListBookings({ userId: BigInt(userId) }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.bookings);
      }
    });
  });
};