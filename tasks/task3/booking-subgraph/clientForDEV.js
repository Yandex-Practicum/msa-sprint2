import BookingService from './bookingService.js';
const bookingService = new BookingService("192.168.0.106:5001");

    console.log('BookingService ListBooking');  
    try {
      const response = await bookingService.listBookings({ user_id: "sdsddsd" });
      console.log('BookingService Response:', response.message);
      //return response.message; 
    } catch (error)
    {
      console.error('BookingService Error:', err);
      //return;
    }  


