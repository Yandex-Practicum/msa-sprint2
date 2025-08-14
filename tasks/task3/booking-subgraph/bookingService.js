import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

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
  async listBookings(userId) {
    console.log('BookingService ListBooking');  
    try {
      const response = await this.client.listBookings({ user_id: userId });
      console.log('BookingService Response:', response.message);
      return response; 
    } catch (error)
    {
      console.error('BookingService Error:', err);
      return;
    }  

  }
  
  async createBooking(bookingRequest) {
    console.log('BookingService CreateBooking');
    try {
      const response = await this.client.createBooking(bookingRequest);
      console.log('BookingService Response:', response.message);
      return response; 
    } catch (error)
    {
      console.error('BookingService Error:', err);
      return;
    }    

  }

}

export default BookingService;
