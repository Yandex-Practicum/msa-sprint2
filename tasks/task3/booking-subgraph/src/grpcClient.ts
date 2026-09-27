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

// booking-service (задание 2) умеет отдавать список бронирований только по userId —
// отдельного RPC "получить бронь по id" в контракте нет, поэтому booking(id) и
// __resolveReference ищут нужную бронь внутри списка бронирований текущего
// пользователя (см. booking-subgraph/src/index.ts). Это заодно даёт ACL "бесплатно".
export function listBookingsByUser(userId: string): Promise<GrpcBooking[]> {
  console.log(`[booking-subgraph] gRPC ListBookings({ user_id: "${userId}" }) -> booking-service:${port}`);
  return new Promise((resolve, reject) => {
    client.listBookings({ user_id: userId }, (err: grpc.ServiceError | null, response: any) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`[booking-subgraph] gRPC ListBookings ответ: ${response?.bookings?.length ?? 0} бронирований`);
      resolve(response?.bookings ?? []);
    });
  });
}
