using System.Text.Json;
using BookingHistoryService.Models;
using Confluent.Kafka;

namespace BookingHistoryService.Kafka;

public class BookingEventConsumer : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BookingEventConsumer> _logger;
    private readonly string _topic;
    private readonly string _bootstrapServers;
    private readonly string _groupId;
    
    public BookingEventConsumer(IServiceProvider serviceProvider, ILogger<BookingEventConsumer> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _topic = Environment.GetEnvironmentVariable("KAFKA_TOPIC") ?? "booking-events";
        _bootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? "kafka:9092";
        _groupId = Environment.GetEnvironmentVariable("KAFKA_GROUP_ID") ?? "booking-history-group";
    }

    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Запуск Kafka Consumer для топика {Topic}", _topic);

        var config = new ConsumerConfig
        {
            BootstrapServers = _bootstrapServers,
            GroupId = _groupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
        consumer.Subscribe(_topic);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = consumer.Consume(stoppingToken);

                    if (consumeResult.Message.Value != null)
                    {
                        _logger.LogInformation("Получено сообщение: {Message}", consumeResult.Message.Value);
                        await ProcessMessageAsync(consumeResult.Message.Value);
                        consumer.Commit(consumeResult);
                    }
                }
                catch (ConsumeException e)
                {
                    _logger.LogError(e, "Ошибка при потреблении сообщения: {Reason}", e.Error.Reason);
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Consumer остановлен");
        }
        finally
        {
            consumer.Close();
        }
    }

    private async Task ProcessMessageAsync(string message)
    {
        try
        {
            var bookingEvent = JsonSerializer.Deserialize<JsonElement>(message);

            var history = new BookingHistory
            {
                BookingId = bookingEvent.GetProperty("BookingId").GetString() ?? "",
                UserId = bookingEvent.GetProperty("UserId").GetString() ?? "",
                HotelId = bookingEvent.GetProperty("HotelId").GetString() ?? "",
                PromoCode = bookingEvent.TryGetProperty("PromoCode", out var promo) ? promo.GetString() : null,
                DiscountPercent = bookingEvent.GetProperty("DiscountPercent").GetDecimal(),
                Price = bookingEvent.GetProperty("Price").GetDecimal(),
                BookingCreatedAt = DateTime.Parse(bookingEvent.GetProperty("CreatedAt").GetString()!)
            };

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<BookingHistoryContext>();

            context.BookingHistories.Add(history);
            await context.SaveChangesAsync();

            _logger.LogInformation("Бронирование {BookingId} сохранено в историю", history.BookingId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка обработки сообщения: {Message}", message);
        }
    }
}