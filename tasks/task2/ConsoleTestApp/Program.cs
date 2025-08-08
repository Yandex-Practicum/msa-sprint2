using System;
using System.Threading.Tasks;
using Grpc.Net.Client;
using BookingService;

// Настройка канала подключения
var adress = "http://localhost:5001";
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
    // Пример создания бронирования
    var bookingResponse = await client.CreateBookingAsync(new BookingRequest
    {
        UserId = "user_123",
        HotelId = "hotel_456",
        PromoCode = "SUMMER10"
    });
    Console.WriteLine(adress);
    Console.WriteLine($"Created booking ID: {bookingResponse.Id}");
    Console.WriteLine($"Price with discount: {bookingResponse.Price}");

   
    // Пример получения списка бронирований
    var listResponse = await client.ListBookingsAsync(new BookingListRequest
    {
        UserId = "user_123"
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