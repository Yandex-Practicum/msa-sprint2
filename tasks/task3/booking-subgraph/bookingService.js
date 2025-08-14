import grpc from '@grpc/grpc-js';
import pkg from '@grpc/proto-loader';
const {loadPackageDefinition} = pkg;
/**
 * BookingService
*/
// Загрузка proto-файла
    const PROTO_PATH = './booking.proto';
    
    const packageDefinition = loadPackageDefinition(
      PROTO_PATH,
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
