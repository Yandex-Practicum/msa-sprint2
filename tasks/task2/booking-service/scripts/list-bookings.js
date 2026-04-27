const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "..", "booking.proto");
const target = process.env.BOOKING_GRPC_TARGET || "booking-service:9090";
const userId = process.env.USER_ID || "";

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;
const client = new bookingProto.BookingService(target, grpc.credentials.createInsecure());

client.ListBookings({ user_id: userId }, (error, response) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(JSON.stringify(response.bookings, null, 2));
});
