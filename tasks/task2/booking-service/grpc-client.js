import grpc from "@grpc/grpc-js";
import loader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const def = loader.loadSync(path.resolve(__dirname, "booking.proto"), { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const pkg = grpc.loadPackageDefinition(def).booking;
const client = new pkg.BookingService("booking-service:9090", grpc.credentials.createInsecure());
const userId = process.argv[2] || "";
client.ListBookings({ user_id: userId }, (e, r) => {
if (e) { console.error(e.message); process.exit(1); }
console.log(JSON.stringify(r));
});
