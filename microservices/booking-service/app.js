process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5433';
process.env.DB_USER = process.env.DB_USER || 'booking';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'booking';
process.env.DB_NAME = process.env.DB_NAME || 'booking_db';
process.env.USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8084';
process.env.HOTEL_SERVICE_URL = process.env.HOTEL_SERVICE_URL || 'http://localhost:8084';
process.env.PROMO_SERVICE_URL = process.env.PROMO_SERVICE_URL || 'http://localhost:8084';
process.env.REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://localhost:8084';
process.env.KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
process.env.GRPC_PORT = process.env.GRPC_PORT || '9090';
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { initDb } = require('./db');
const bookingController = require('./controllers/bookingController');

const PROTO_PATH = path.join(__dirname, 'booking.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition).booking;
console.log('Loaded service:', Object.keys(proto.BookingService.service));
console.log('Full proto structure:', Object.keys(proto));

async function main() {
    await initDb();

    const server = new grpc.Server();

    server.addService(proto.BookingService.service, {
        createBooking: bookingController.createBooking,
        listBookings: bookingController.listBookings,
    });

    const port = process.env.GRPC_PORT;
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, bindPort) => {
        if (err) {
            console.error('Failed to bind server:', err);
            return;
        }
        console.log(`gRPC server running on port ${bindPort}`);
        server.start();
    });
}

main().catch(console.error);