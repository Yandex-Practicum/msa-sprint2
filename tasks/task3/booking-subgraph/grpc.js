import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// 1. Define the path to your .proto file and options
const PROTO_PATH = './booking.proto';
const GRPC_SERVER_ADDRESS = 'booking-service:9090';

// Options for proto-loader (ensures consistency)
const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// 2. Load the package definition
const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);

// 3. Load the gRPC package definition into an object
// The 'user' key matches the 'package user;' line in the .proto file
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

// 4. Create the client instance (stub)
// Use grpc.credentials.createInsecure() for unencrypted local testing
const client = new bookingProto.BookingService(
    GRPC_SERVER_ADDRESS,
    grpc.credentials.createInsecure()
);

// 5. Make an RPC call
export function listBookings(user_id) {
  const requestPayload = { user_id: user_id };

  // Оборачиваем асинхронный вызов в Promise
  return new Promise((resolve, reject) => {
    client.ListBookings(requestPayload, (error, response) => {
      if (error) {
        console.error('Error fetching bookings:', error.details || error.message);
        return reject(error); // Отклоняем Promise при ошибке gRPC
      }
      // Успех: разрешаем Promise с массивом бронирований
      resolve(response.bookings); 
    });
  });
}
