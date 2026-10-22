import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const proto = grpc.loadPackageDefinition(protoLoader.loadSync('booking.proto')).booking;
const client = new proto.BookingService(process.env.TARGET || 'localhost:9090', grpc.credentials.createInsecure());
client.ListBookings({ userId: process.argv[2] || '' }, (err, res) => {
  if (err) { console.error(err.message); process.exit(1); }
  console.log(JSON.stringify(res.bookings, null, 2));
});
