import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_PATH = path.resolve(__dirname, "..", "booking.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as any;

const host = process.env.BOOKING_GRPC_HOST ?? "localhost";
const port = process.env.BOOKING_GRPC_PORT ?? "9090";

const client = new proto.booking.BookingService(`${host}:${port}`, grpc.credentials.createInsecure());

export interface GrpcBooking {
  id: string;
  user_id: string;
  hotel_id: string;
  promo_code: string;
  discount_percent: number;
  price: number;
  created_at: string;
}

// Нужен, чтобы достать "исходный" discountPercent — тот, что booking-service
// посчитал и сохранил в момент создания брони (originalDiscount в DiscountInfo).
export function listBookingsByUser(userId: string): Promise<GrpcBooking[]> {
  return new Promise((resolve, reject) => {
    client.listBookings({ user_id: userId }, (err: grpc.ServiceError | null, response: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(response?.bookings ?? []);
    });
  });
}
