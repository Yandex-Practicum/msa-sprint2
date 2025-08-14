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

const bookingProto = grpc.loadPackageDefinition(packageDefinition);
const { BookingService } = bookingProto.booking

class BookingServiceClient{

  constructor(serviceHostAndPort) {
    // Создание клиента    
    this.client = new BookingService(
      serviceHostAndPort,
      grpc.credentials.createInsecure()
    );
  }
  
  listBookingsByUserId(UserId) {
    return new Promise((resolve, reject) => {
      this.client.listBookings({ user_id: UserId }, (err, response) => {
      if (err) {
        console.error("RPC Error:", err.message); // Обработка ошибки
        reject(err);
      }

      if (!response) {
        console.error("Received empty response");
        resolve(response)
      }; 
      resolve(response)
      }); 
    });
  }


  listBookings(request) {
    return new Promise((resolve, reject) => {
      this.client.listBookings(request, (err, response) => {
      if (err) {
        console.error("RPC Error:", err.message); // Обработка ошибки
        reject(err);
      }

      if (!response) {
        console.error("Received empty response");
        resolve(response)
      }; 
      resolve(response)
      }); 
    });
  }


}

export default BookingServiceClient;
