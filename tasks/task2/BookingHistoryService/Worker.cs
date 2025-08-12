using BookingHistoryService.Data;
using BookingHistoryService.Models;
using Confluent.Kafka;
using System.Text.Json;
using static Confluent.Kafka.ConfigPropertyNames;
namespace BookingHistoryService
{
    public class Worker(ILogger<Worker> logger, IServiceProvider serviceProvider) : BackgroundService
    {
        private readonly ILogger<Worker> _logger = logger;
        private readonly string _kafkaServers = Environment.GetEnvironmentVariable("KAFKA_HOSTS") ?? "kafka:9092";
        private readonly string _kafkaGroupId = Environment.GetEnvironmentVariable("KAFKA_GROUP") ?? "booking-history-group";
        private readonly string _kafkaTopic = Environment.GetEnvironmentVariable("KAFKA_TOPIC") ?? "booking-events";
        private readonly IServiceProvider _serviceProvider = serviceProvider;

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BookingHistoryService - Worker was started at: {time}", DateTimeOffset.Now);
            var config = new ConsumerConfig
            {
                BootstrapServers = _kafkaServers,
                GroupId = _kafkaGroupId,
                AutoOffsetReset = AutoOffsetReset.Earliest
            };
            using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
            consumer.Subscribe(_kafkaTopic);
            
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var result = consumer.Consume(stoppingToken);

                    // Создаем scope для каждого сообщения
                    using var scope = _serviceProvider.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<BookingHistoryDbContext>();

                    var bookingEvent = JsonSerializer.Deserialize<BookingEvent>(result.Message.Value);

                    await dbContext.BookingHistory.AddAsync(new BookingHistory
                    {
                        EventId = bookingEvent.EventId,
                        UserId = bookingEvent.UserId,
                        Action = bookingEvent.Action,
                        CreatedAt = bookingEvent.Timestamp
                    });

                    await dbContext.SaveChangesAsync();
                    _logger.LogInformation($"Событие сохранено: {bookingEvent.EventId}");
                }
                catch (Exception ex)
                {
                    _logger.LogInformation($"Ошибка обработки: {ex.Message}");
                }

                //if (_logger.IsEnabled(LogLevel.Information))
                await Task.Delay(1000, stoppingToken);
            }
        }
        
    }

    public record BookingEvent(int EventId, string UserId, string Action, DateTime Timestamp);
}
