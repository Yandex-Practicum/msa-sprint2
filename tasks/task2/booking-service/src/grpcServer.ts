import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ReflectionService } from "@grpc/reflection";
import { HealthImplementation, ServingStatusMap } from "grpc-health-check";
import { Booking } from "./entity/Booking";
import { createBooking, listBookings, ValidationError } from "./bookingLogic";

// By convention, "" reports overall server liveness (serving as soon as the
// gRPC server is bound); "readiness" reports whether dependencies (DB, Kafka)
// are connected and the service can actually handle traffic.
const READINESS_SERVICE = "readiness";

const healthStatusMap: ServingStatusMap = {
  "": "NOT_SERVING",
  [READINESS_SERVICE]: "NOT_SERVING",
};

const healthImpl = new HealthImplementation(healthStatusMap);

export function setReady(ready: boolean): void {
  healthImpl.setStatus(READINESS_SERVICE, ready ? "SERVING" : "NOT_SERVING");
}

const PROTO_PATH = path.resolve(__dirname, "..", "booking.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as any;

function toProtoBooking(booking: Booking) {
  return {
    id: String(booking.id),
    user_id: booking.userId,
    hotel_id: booking.hotelId,
    promo_code: booking.promoCode ?? "",
    discount_percent: booking.discountPercent,
    price: booking.price,
    created_at: booking.createdAt.toISOString(),
  };
}

function toGrpcError(err: unknown): grpc.ServiceError {
  if (err instanceof ValidationError) {
    return { code: grpc.status.FAILED_PRECONDITION, message: err.message } as grpc.ServiceError;
  }
  console.error("booking-service internal error:", err);
  return { code: grpc.status.INTERNAL, message: "Internal error" } as grpc.ServiceError;
}

const serviceImpl = {
  createBooking: (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): void => {
    const { user_id, hotel_id, promo_code } = call.request;
    createBooking(user_id, hotel_id, promo_code || null)
      .then((booking) => callback(null, toProtoBooking(booking)))
      .catch((err) => callback(toGrpcError(err)));
  },

  listBookings: (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): void => {
    const { user_id } = call.request;
    listBookings(user_id || undefined)
      .then((bookings) => callback(null, { bookings: bookings.map(toProtoBooking) }))
      .catch((err) => callback(toGrpcError(err)));
  },
};

export function startGrpcServer(): void {
  const server = new grpc.Server();
  server.addService(proto.booking.BookingService.service, serviceImpl);

  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  healthImpl.addToServer(server);

  const port = Number(process.env.GRPC_PORT ?? 9090);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) {
      console.error("Failed to bind gRPC server", err);
      process.exit(1);
    }
    healthImpl.setStatus("", "SERVING");
    console.log(`booking-service gRPC server listening on port ${port}`);
  });
}
