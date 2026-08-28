

using Grpc.Core;
using BookingService.Models;
using BookingService.Kafka;
using BookingService.Protos;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Services;

public class BookingGrpcService : BookingService.Protos.BookingService.BookingServiceBase
{
    private readonly BookingContext _context;
    private readonly BookingEventProducer _kafkaProducer;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<BookingGrpcService> _logger;

    public BookingGrpcService(
        BookingContext context,
        BookingEventProducer kafkaProducer,
        IHttpClientFactory httpClientFactory,
        ILogger<BookingGrpcService> logger)
    {
        _context = context;
        _kafkaProducer = kafkaProducer;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public override async Task<BookingResponse> CreateBooking(BookingRequest request, ServerCallContext context)
    {
        _logger.LogInformation("Создание бронирования: UserId={UserId}, HotelId={HotelId}",
            request.UserId, request.HotelId);

        var client = _httpClientFactory.CreateClient("MonolithClient");
        var baseUrl = Environment.GetEnvironmentVariable("MONOLITH_URL") ?? "http://monolith:8080";

        // 1. Проверка пользователя
        var userResponse = await client.GetAsync($"{baseUrl}/api/users/{request.UserId}/authorized");
        if (!userResponse.IsSuccessStatusCode || !await userResponse.Content.ReadFromJsonAsync<bool>())
        {
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Пользователь не авторизован"));
        }

        // 2. Проверка отеля (operational)
        var hotelOperational = await client.GetAsync($"{baseUrl}/api/hotels/{request.HotelId}/operational");
        if (!hotelOperational.IsSuccessStatusCode || !await hotelOperational.Content.ReadFromJsonAsync<bool>())
        {
            throw new RpcException(new Status(StatusCode.FailedPrecondition, "Отель не работает"));
        }

        // 3. Проверка отеля (trusted)
        var hotelTrusted = await client.GetAsync($"{baseUrl}/api/reviews/hotel/{request.HotelId}/trusted");
        if (!hotelTrusted.IsSuccessStatusCode || !await hotelTrusted.Content.ReadFromJsonAsync<bool>())
        {
            throw new RpcException(new Status(StatusCode.FailedPrecondition, "Отель не доверенный"));
        }

        // 4. Проверка отеля (fully-booked)
        var hotelFullyBooked = await client.GetAsync($"{baseUrl}/api/hotels/{request.HotelId}/fully-booked");
        if (!hotelFullyBooked.IsSuccessStatusCode || await hotelFullyBooked.Content.ReadFromJsonAsync<bool>())
        {
            throw new RpcException(new Status(StatusCode.ResourceExhausted, "Отель полностью забронирован"));
        }

        // 5. Проверка промокода
        decimal discount = 0;
        if (!string.IsNullOrEmpty(request.PromoCode))
        {
            var promoResponse = await client.PostAsync(
                $"{baseUrl}/api/promos/validate?code={request.PromoCode}&userId={request.UserId}",
                null);

            if (promoResponse.IsSuccessStatusCode)
            {
                var promoData = await promoResponse.Content.ReadFromJsonAsync<JsonElement>();
                discount = promoData.GetProperty("discount").GetDecimal();
            }
        }

        // 6. Сохраняем бронирование
        var booking = new Booking
        {
            UserId = request.UserId,
            HotelId = request.HotelId,
            PromoCode = request.PromoCode,
            DiscountPercent = discount,
            Price = 100 - (100 * discount / 100),
            CreatedAt = DateTime.UtcNow
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Бронирование создано: BookingId={BookingId}", booking.Id);

        // 7. Отправляем событие в Kafka
        var bookingEvent = new
        {
            BookingId = booking.Id.ToString(),
            UserId = booking.UserId,
            HotelId = booking.HotelId,
            PromoCode = booking.PromoCode,
            DiscountPercent = booking.DiscountPercent,
            Price = booking.Price,
            CreatedAt = booking.CreatedAt.ToString("O")
        };

        await _kafkaProducer.ProduceAsync("booking-events", JsonSerializer.Serialize(bookingEvent));

        // 8. Возвращаем ответ
        return new BookingResponse
        {
            Id = booking.Id.ToString(),
            UserId = booking.UserId,
            HotelId = booking.HotelId,
            PromoCode = booking.PromoCode ?? "",
            DiscountPercent = (double)booking.DiscountPercent,
            Price = (double)booking.Price,
            CreatedAt = booking.CreatedAt.ToString("O")
        };
    }

    public override async Task<BookingListResponse> ListBookings(BookingListRequest request, ServerCallContext context)
    {
        _logger.LogInformation("Получение списка бронирований: UserId={UserId}", request.UserId);

        var bookings = await _context.Bookings
            .Where(b => b.UserId == request.UserId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var response = new BookingListResponse();
        foreach (var booking in bookings)
        {
            response.Bookings.Add(new BookingResponse
            {
                Id = booking.Id.ToString(),
                UserId = booking.UserId,
                HotelId = booking.HotelId,
                PromoCode = booking.PromoCode ?? "",
                DiscountPercent = (double)booking.DiscountPercent,
                Price = (double)booking.Price,
                CreatedAt = booking.CreatedAt.ToString("O")
            });
        }

        return response;
    }
}