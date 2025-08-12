using System;
using System.Threading.Tasks;
using Grpc.Net.Client;
using BookingService;
using BookingService.Services;
using System.ComponentModel.DataAnnotations;

//try
//{
//    var mono = new MonolitService();
//    var r =mono.IsUserBlacklisted("test-user-2");
//    Console.WriteLine(r);   

//}
//catch (Exception ex)
//{
//    Console.WriteLine(ex);

//}

// Настройка канала подключения
var adress = "http://127.0.0.1:5001";
var channel = GrpcChannel.ForAddress(adress, 
    new GrpcChannelOptions
    {
        HttpHandler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback =
                HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        }
    }
    );
//var adress = "https://localhost:5001";
//var channel = GrpcChannel.ForAddress(adress);
var client = new BookingService.BookingService.BookingServiceClient(channel);


try
{
    var listResponse1 = await client.ListBookingsAsync(null);


    // Пример создания бронирования
    var bookingResponse = await client.CreateBookingAsync(new BookingRequest
    {
        UserId = "test-user-2",
        HotelId = "test-hotel-1",
        PromoCode = "TESTCODE1"
    });
    Console.WriteLine(adress);
    Console.WriteLine($"Created booking ID: {bookingResponse.Id}");
    Console.WriteLine($"Price with discount: {bookingResponse.Price}");


    // Пример получения списка бронирований


    var listResponse = await client.ListBookingsAsync(new BookingListRequest
     {
         UserId = "test-user-2"
     });
    Console.WriteLine(adress);
    Console.WriteLine("\nUser bookings:");
    foreach (var booking in listResponse.Bookings)
    {
        Console.WriteLine($"- ID: {booking.Id}, Hotel: {booking.HotelId}, Price: {booking.Price}");
    }
}
catch (Exception ex)
{

    Console.WriteLine(adress);
    Console.WriteLine($"Error: {ex.Message}");
}