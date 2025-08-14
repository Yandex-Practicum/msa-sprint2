import { grpc } from '@grpc/grpc-js';
import { protoLoader } from ('@grpc/proto-loader');

// Загрузка proto-файла
const packageDefinition = protoLoader.loadSync(
  './booking.proto',
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);

const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

class BookingService {

  constructor(serviceHostAndPort) {
    // Создание клиента
    this.client = new bookingProto.BookingService(
    serviceHostAndPort,
    grpc.credentials.createInsecure()
    );
  }
  listBookings(userId) {
    console.log('BookingService ListBooking');  
    client.ListBookings({ user_id: userId }, (err, response) => {
      if (err) {
      console.error('BookingService Error:', err);
      return;
      }
      console.log('BookingService Response:', response.message);
      return response;      
    });    

  }
  
  createBooking(bookingRequest) {
    console.log('BookingService CreateBooking');  
    client.CreateBooking(bookingRequest, (err, response) => {
      if (err) {
      console.error('BookingService Error:', err);
      return;
      }
      console.log('BookingService Response:', response.message);
      return response;      
    });    

  }

}

export default BookingService;
