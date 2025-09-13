using HotelioHistoryService.Domain;
using HotelioHistoryService.DomainDto;
using HotelioHistoryService.Repostitory;
using HotelioHistoryService.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelioHistoryService.Workers;

public class BookingHistoryWorker
    : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private IBookingHistoryRepository _repository;
    private IKafkaConsumerService<BookingDto> _kafkaConsumerService;
    private ILogger<BookingHistoryWorker> _logger;
    private bool _isInitialized = false;

    public BookingHistoryWorker(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }


    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        _repository = scope.ServiceProvider.GetRequiredService<IBookingHistoryRepository>();
        _kafkaConsumerService = scope.ServiceProvider.GetRequiredService<IKafkaConsumerService<BookingDto>>();
        _logger = scope.ServiceProvider.GetRequiredService<ILogger<BookingHistoryWorker>>();
        while (!stoppingToken.IsCancellationRequested)
        {
            _kafkaConsumerService.OnMessageReceived += KafkaConsumerServiceOnOnMessageReceived;
            _kafkaConsumerService.ConsumeMessages("bookings");
        }

        _kafkaConsumerService.StopConsuming();
        return Task.CompletedTask;
    }

    private void KafkaConsumerServiceOnOnMessageReceived(object? sender, BookingDto e)
    {
        var entity = ConvertFromDto(e);
        _repository.CreateAsync(entity).ConfigureAwait(false);
    }

    private BookingHistory ConvertFromDto(BookingDto dto)
    {
        var result = new BookingHistory()
        {
            BookingDate = dto.CreatedAt,
            BookingId = dto.Id,
            DiscountPrecent = dto.DiscountPrecent,
            HotelId = dto.HotelId,
            Price = dto.Price,
            PromoCode = dto.PromoCode,
            UserId = dto.UserId,
        };
        return result;
    }
}