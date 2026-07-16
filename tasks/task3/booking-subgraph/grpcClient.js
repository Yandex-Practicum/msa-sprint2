import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(process.cwd(), 'proto/booking.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const client = new bookingProto.BookingService(
    'booking-service:9090',
    grpc.credentials.createInsecure()
);

export function listBookings(userId) {
    return new Promise((resolve, reject) => {
        client.ListBookings({ userId }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response.bookings);
            }
        });
    });
}