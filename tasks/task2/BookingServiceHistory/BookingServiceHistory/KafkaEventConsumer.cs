using System.Text.Json;
using System.Text.Json.Serialization;
using Confluent.Kafka;
using Microsoft.Extensions.Options;

namespace BookingServiceHistory;

public class KafkaEventConsumer : BackgroundService
{
    private readonly ILogger<KafkaEventConsumer> _logger;
    private readonly KafkaOptions _kafkaOptions;
    private readonly IServiceProvider _serviceProvider;

    public KafkaEventConsumer(
        ILogger<KafkaEventConsumer> logger,
        IOptions<KafkaOptions> kafkaOptions,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _kafkaOptions = kafkaOptions.Value;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Starting Kafka consumer for topic 'booking-events'...");

        var config = new ConsumerConfig
        {
            BootstrapServers = _kafkaOptions.BootstrapServers,
            GroupId = _kafkaOptions.GroupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false // рекомендуется для надёжности
        };

        using var consumer = new ConsumerBuilder<Null, string>(config).Build();
        consumer.Subscribe("booking-events");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = consumer.Consume(stoppingToken);

                    if (consumeResult?.Message != null)
                    {
                        _logger.LogInformation("Received message: {Value}", consumeResult.Message.Value);

                        // Обработка сообщения
                        await HandleMessageAsync(consumeResult.Message.Value, stoppingToken);

                        // Подтверждаем обработку (commit offset)
                        consumer.Commit(consumeResult);
                    }
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming message from Kafka");
                    // Можно отправить в DLQ или повторить
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Kafka consumer is shutting down...");
        }
        finally
        {
            consumer.Close();
        }
    }

    private async Task HandleMessageAsync(string message, CancellationToken cancellationToken)
    {
        var jsonOptions = new JsonSerializerOptions
        {
            NumberHandling = JsonNumberHandling.AllowReadingFromString,
            PropertyNameCaseInsensitive = true
        };
        
        try
        {
            // Пример: десериализация события
            var @event = JsonSerializer.Deserialize<Booking>(message, jsonOptions);

            // Здесь можно вызвать сервис через DI
            using var scope = _serviceProvider.CreateScope();
            var bookingHandler = scope.ServiceProvider.GetRequiredService<IBookingEventHandler>();
            await bookingHandler.HandleAsync(@event!, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to handle Kafka message: {Message}", message);
            throw; // или логируйте и продолжайте
        }
    }
}

// Интерфейс для обработчика
public interface IBookingEventHandler
{
    Task HandleAsync(Booking @event, CancellationToken cancellationToken);
}

// Реализация (пример)
public class BookingEventHandler : IBookingEventHandler
{
    private readonly ILogger<BookingEventHandler> _logger;
    private readonly IBookingRepository _bookingRepository;

    public BookingEventHandler(ILogger<BookingEventHandler> logger, IBookingRepository bookingRepository)
    {
        _logger = logger;
        _bookingRepository = bookingRepository;
    }

    public async Task HandleAsync(Booking @event, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Handling booking event: {BookingId}", @event.Id);
        
        if(@event != null)
            await _bookingRepository.SaveAsync(@event);
    }
}