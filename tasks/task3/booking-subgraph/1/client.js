import BookingServiceClient from './bookingService.js';
const bookingService = new BookingServiceClient("192.168.0.106:5001");

console.log('listBookingsByUserId');  
var response2 =await bookingService.listBookingsByUserId();
console.log(response2);  

console.log("----------");  
var req = { user_id: "" };
var response1 = await bookingService.listBookings({ user_id: "" });
console.log(response1); 

console.log('listBookings("test-user-3")');  
var req = { user_id: "test-user-3" };
var response3 = await bookingService.listBookings(req);
console.log(response3);

